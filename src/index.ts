import {makeDOMDriver, div, h, pre, DOMSource, VNode} from '@cycle/dom';
import {run} from '@cycle/run';
import xs, {Stream} from 'xstream';
import {add, subtract, Vector} from './vector';
import {timeDriver} from '@cycle/time';
import {TimeSource} from '@cycle/time/dist/time-source';

const drivers = {
  DOM: makeDOMDriver('.app'),
  Time: timeDriver
}

type Sources = {
  DOM: DOMSource,
  Time: TimeSource
}

type Sinks = {
  DOM: Stream<VNode>
}

type State = {
  rootBone: Bone,

  addingBoneAddress: null | Address,

  mode: 'idle' | 'addingBone',

  mousePosition: Vector
}

type Reducer = (state: State) => State;
type Address = number[];

type Bone = {
  id: number;
  vector: Vector;
  children: Bone[];
}

type BoneId = number | ':root';


function renderBone (bone: Bone, parentPosition: Vector, address: Address): VNode {
  const position = add(parentPosition, bone.vector);

  return (
    h('g', [
      h('line', {
        attrs: {
          x1: position.x,
          y1: position.y,
          x2: parentPosition.x,
          y2: parentPosition.y,
          stroke: 'black'
        }
      }),

      h('circle', {
        attrs: {
          cx: position.x,
          cy: position.y,
          r:  10,
          fill: 'white',
          stroke: 'lime',
          boneAddress: address.join(',')
        },

      })
    ])
  )
}

function flatten (arr: any): any {
  if (typeof arr.reduce !== 'function') {
    return arr;
  }

  return arr.reduce((acc: any[], val: any) => acc.concat(flatten(val)), []);
}


function renderSkeleton (bone: Bone, parentPosition: Vector, parentAddress: Address): VNode[] {
  const position = add(parentPosition, bone.vector);
  const address = parentAddress.concat(bone.id);

  return [
    renderBone(bone, parentPosition, address),

    ...flatten(bone.children.map(childBone => renderSkeleton(childBone, position, address)))
  ];
}

function view (state: State) {
  const viewBox = `-320 -240 640 480`;
  const extras = [];

  if (state.mode === 'addingBone') {
    extras.push(renderAddingBone(state))
  }

  const renderedBonesTree = renderSkeleton(
    state.rootBone,
    {x: 0, y: 0},
    []
  );

  return (
    div('.skelemation', [
      h('svg', {attrs: {viewBox}}, [
        ...flatten(renderedBonesTree),

        ...extras
      ]),

      pre(JSON.stringify(state, null, 2)),
    ])
  )
}

function renderAddingBone (state: State): VNode {
  const boneOriginPosition = bonePosition(state.rootBone, state.addingBoneAddress as Address);

  return (
    h('line', {
      attrs: {
        x1: boneOriginPosition.x,
        y1: boneOriginPosition.y,
        x2: state.mousePosition.x,
        y2: state.mousePosition.y,
        stroke: 'teal'
      }
    })
  )
}

function incrementalIdMakerFactoryWoo () {
  let id = 0;

  return function () {
    return id++;
  }
}

const idMaker = incrementalIdMakerFactoryWoo();

function addBone (bone: Bone, address: Address, newBone: {vector: Vector}): Bone {
  const id = idMaker();

  const boneToAddTo = findBone(bone, address);
  boneToAddTo.children.push({...newBone, id, children: []});

  return bone;
}

function startAddingBoneReducer (event: MouseEvent): Reducer {
  return function (state: State): State {
    const address = (event.currentTarget as Element).getAttribute('boneAddress');

    state.mode = 'addingBone';
    state.addingBoneAddress = (address as string).split(',').map(s => parseInt(s, 10));

    return state;
  }
}

function bonePosition (bone: Bone, address: Address): Vector {
  return bonesOnAddress(bone, address)
    .map(bone => bone.vector)
    .reduce(add, {x: 0, y: 0});
}

function bonesOnAddress (bone: Bone, address: Address): Bone[] {
  const fauxRootBone = {children: [bone], vector: {x: 0, y: 0}, id: -1};

  const bones : Bone[] = [];

  address.reduce((bone, id) => {
    const boneIndex = bone.children.findIndex((bone: Bone) => bone.id === id);

    const relevantBone = bone.children[boneIndex];

    bones.push(relevantBone);

    return relevantBone;
  }, fauxRootBone);

  return bones;
}

function findBone (bone: Bone, address: Address): Bone {
  const fauxRootBone = {children: [bone], vector: {x: 0, y: 0}, id: -1};

  return address.reduce((bone, id) => {
    const boneIndex = bone.children.findIndex((bone: Bone) => bone.id === id);

    return bone.children[boneIndex];
  }, fauxRootBone);
}

function finishAddingBoneReducer (event: MouseEvent): Reducer {
  return function (state: State): State {
    if (state.mode !== 'addingBone') {
      return state;
    }

    const parentAddress = state.addingBoneAddress as Address;

    state.mode = 'idle';
    state.addingBoneAddress = null;
    const parentBonePosition = bonePosition(state.rootBone, parentAddress);

    state.rootBone = addBone(state.rootBone, parentAddress, {
      vector: subtract(state.mousePosition, parentBonePosition)
    });

    return state;
  }
}

function applyReducer (state: State, reducer: Reducer): State {
  return reducer(state);
}

function mousePosition (event: MouseEvent): Vector {
  return {
    x: event.clientX,
    y: event.clientY
  }
}

function positionInSvg (svg: any) {
  return function (mousePosition: Vector): Vector {
    const point = svg.createSVGPoint();
    point.x = mousePosition.x;
    point.y = mousePosition.y;

    const transformMatrix = svg.getScreenCTM().inverse();

    const transformedPoint = point.matrixTransform(transformMatrix);

    return {
      x: transformedPoint.x,
      y: transformedPoint.y
    }
  }
}

function updateMousePosition (mousePosition: Vector): Reducer {
  return function (state: State): State {
    state.mousePosition = mousePosition;

    return state;
  }
}

function main (sources: Sources): Sinks {
  const initialState: State = {
    mode: 'idle',
    addingBoneAddress: null,
    mousePosition: {x: 0, y: 0},

    rootBone: {id: idMaker(), vector: {x: 0, y: 0}, children: []}
  }

  const mousePosition$ = sources.DOM
    .select('document')
    .events('mousemove')
    .map(mousePosition)
    .compose(sources.Time.throttleAnimation);

  const svg$ = sources.DOM
    .select('svg')
    .elements()
    .compose(sources.Time.throttleAnimation)
    .map((elements: Element[]) => elements[0]);

  const mousePositionInSvg$ = svg$
    .map(svg => mousePosition$.map(positionInSvg(svg)))
    .flatten();

  const startAddingBone$ = sources.DOM
    .select('circle') // TODO - be more specific
    .events('mousedown')
    .map(startAddingBoneReducer);

  const finishAddingBone$ = sources.DOM
    .select('document')
    .events('mouseup')
    .map(finishAddingBoneReducer);

  const updateMousePosition$ = mousePositionInSvg$
    .map(updateMousePosition);

  const reducer$ = xs.merge(
    startAddingBone$,
    finishAddingBone$,
    updateMousePosition$
  );

  const state$ = reducer$.fold(applyReducer, initialState);

  return {
    DOM: state$.map(view)
  }
}

run(main, drivers);
