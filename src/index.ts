import {makeDOMDriver, div, h, pre, button, DOMSource, VNode} from '@cycle/dom';
import {run} from '@cycle/run';
import {timeDriver} from '@cycle/time';
import {TimeSource} from '@cycle/time/dist/time-source';
import isolate from '@cycle/isolate';
import xs, {Stream} from 'xstream';

import {add, subtract, Vector} from './vector';

const drivers = {
  DOM: makeDOMDriver('.app'),
  Time: timeDriver
}

const skellington : Bone = {
  "id": 0,
  "vector": {
    "x": 0,
    "y": 0
  },
  "children": [
    {
      "vector": {
        "x": 12.800000190734863,
        "y": 36.79999923706055
      },
      "id": 1,
      "children": [
        {
          "vector": {
            "x": 0.8000001907348633,
            "y": 35.20000076293945
          },
          "id": 2,
          "children": [
            {
              "vector": {
                "x": 15.19999885559082,
                "y": 5.599998474121094
              },
              "id": 3,
              "children": []
            }
          ]
        }
      ]
    },
    {
      "vector": {
        "x": -7.199999809265137,
        "y": 33.599998474121094
      },
      "id": 4,
      "children": [
        {
          "vector": {
            "x": -0.8000001907348633,
            "y": 34.400001525878906
          },
          "id": 5,
          "children": [
            {
              "vector": {
                "x": 11.200000047683716,
                "y": 5.599998474121094
              },
              "id": 6,
              "children": []
            }
          ]
        }
      ]
    },
    {
      "vector": {
        "x": -0.800000011920929,
        "y": -36
      },
      "id": 7,
      "children": [
        {
          "vector": {
            "x": -0.800000011920929,
            "y": -31.199996948242188
          },
          "id": 8,
          "children": [
            {
              "vector": {
                "x": 19.99999964237213,
                "y": 25.599998474121094
              },
              "id": 9,
              "children": [
                {
                  "vector": {
                    "x": 0.8000011444091797,
                    "y": 38.39999842643738
                  },
                  "id": 10,
                  "children": []
                }
              ]
            },
            {
              "vector": {
                "x": -16.00000035762787,
                "y": 23.999996185302734
              },
              "id": 11,
              "children": [
                {
                  "vector": {
                    "x": 0,
                    "y": 39.20000076293945
                  },
                  "id": 12,
                  "children": []
                }
              ]
            },
            {
              "vector": {
                "x": 0,
                "y": -24
              },
              "id": 13,
              "children": []
            }
          ]
        }
      ]
    }
  ]
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

type Reducer<T> = (state: T) => T;
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

      pre(JSON.stringify(state.rootBone, null, 2)),
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

function startAddingBoneReducer (event: MouseEvent): Reducer<State> {
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

function finishAddingBoneReducer (event: MouseEvent): Reducer<State> {
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

function applyReducer<T> (state: T, reducer: Reducer<T>): T {
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

function updateMousePosition (mousePosition: Vector): Reducer<State> {
  return function (state: State): State {
    state.mousePosition = mousePosition;

    return state;
  }
}

function SkeletonCreator (sources: Sources): Sinks {
  const initialState: State = {
    mode: 'idle',
    addingBoneAddress: null,
    mousePosition: {x: 0, y: 0},

    rootBone: skellington
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

function SkeletonAnimator (sources: Sources): Sinks {
  return {
    DOM: xs.of(div('animator ahoy!'))
  }
}

type MainState = {
  mode: 'creating' | 'animating'
}

function main (sources: Sources): Sinks {
  const skeletonCreator = isolate(SkeletonCreator)(sources);
  const skeletonAnimator = isolate(SkeletonAnimator)(sources);

  const initialState : MainState = {
    mode: 'creating'
  }

  const switchToCreating$ = sources.DOM
    .select('.creating')
    .events('click')
    .mapTo((state: MainState): MainState => ({...state, mode: 'creating'}));

  const switchToAnimating$ = sources.DOM
    .select('.animating')
    .events('click')
    .mapTo((state: MainState): MainState => ({...state, mode: 'animating'}));

  const reducer$ = xs.merge(
    switchToCreating$,
    switchToAnimating$
  );

  const state$ = reducer$.fold(applyReducer, initialState);

  const routes = {
    creating: skeletonCreator,
    animating: skeletonAnimator
  }

  const activeComponentDOM$ = state$
    .map((state: MainState) => routes[state.mode].DOM)
    .flatten();

  function view (vtree: VNode): VNode {
    return (
      div('.app-container', [
        button('.creating', 'Create Skeleton'),
        button('.animating', 'Animate Skeleton'),
        vtree
      ])
    )
  }

  return {
    DOM: activeComponentDOM$.map(view)
  }
}

run(main, drivers);
