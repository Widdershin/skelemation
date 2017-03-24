import {DOMSource, VNode, makeDOMDriver, div, h, pre, button, input, h3} from '@cycle/dom';
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

const TAU = Math.PI * 2;

const skellington : Bone = {
  "id": 0,
  "vector": {
    "x": 0,
    "y": 0
  },
  "rotationFormula": "a",
  "children": [
    {
      "vector": {
        "x": 0,
        "y": -64
      },
      "id": 0,
      "children": [
        {
          "vector": {
            "x": 20,
            "y": 10.400001525878906
          },
          "id": 1,
          "children": [
            {
              "vector": {
                "x": 0.7999992370605469,
                "y": 38.39999866485596
              },
              "id": 2,
              "children": [
                {
                  "vector": {
                    "x": 0,
                    "y": 37.59999942779541
                  },
                  "id": 3,
                  "children": [],
                  "rotationFormula": "a"
                }
              ],
              "rotationFormula": "a"
            }
          ],
          "rotationFormula": "a"
        },
        {
          "vector": {
            "x": -19.200000762939453,
            "y": 8.799999237060547
          },
          "id": 4,
          "children": [
            {
              "vector": {
                "x": -0.7999992370605469,
                "y": 37.60000038146973
              },
              "id": 5,
              "children": [
                {
                  "vector": {
                    "x": -1.6000003814697266,
                    "y": 40.80000114440918
                  },
                  "id": 6,
                  "children": [],
                  "rotationFormula": "a"
                }
              ],
              "rotationFormula": "a"
            }
          ],
          "rotationFormula": "a"
        },
        {
          "vector": {
            "x": 0.800000011920929,
            "y": -31.199996948242188
          },
          "id": 7,
          "children": [],
          "rotationFormula": "a"
        }
      ],
      "rotationFormula": "a"
    },
    {
      "vector": {
        "x": 7.199999809265137,
        "y": 15.199999809265137
      },
      "id": 8,
      "children": [
        {
          "vector": {
            "x": 0,
            "y": 44.000000953674316
          },
          "id": 9,
          "children": [
            {
              "vector": {
                "x": 0,
                "y": 42.39999771118164
              },
              "id": 10,
              "children": [
                {
                  "vector": {
                    "x": 16.800000190734863,
                    "y": 5.599998474121094
                  },
                  "id": 11,
                  "children": [],
                  "rotationFormula": "a"
                }
              ],
              "rotationFormula": "a"
            }
          ],
          "rotationFormula": "a"
        }
      ],
      "rotationFormula": "a"
    },
    {
      "vector": {
        "x": -8.800000190734863,
        "y": 13.600000381469727
      },
      "id": 12,
      "children": [
        {
          "vector": {
            "x": 0.8000001907348633,
            "y": 43.19999885559082
          },
          "id": 13,
          "children": [
            {
              "vector": {
                "x": 0,
                "y": 45.60000228881836
              },
              "id": 14,
              "children": [
                {
                  "vector": {
                    "x": 15.199999809265137,
                    "y": 7.1999969482421875
                  },
                  "id": 15,
                  "children": [],
                  "rotationFormula": "a"
                }
              ],
              "rotationFormula": "a"
            }
          ],
          "rotationFormula": "a"
        }
      ],
      "rotationFormula": "a"
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
  rotationFormula: string;
}

function rotate (point: Vector, angle: number) {
  return {
    x: point.x * Math.cos(angle) - point.y * Math.sin(angle),
    y: point.x * Math.sin(angle) + point.y * Math.cos(angle)
  }
}

function renderBone (bone: Bone, parentPosition: Vector, address: Address, waveRotation: number, parentRotation: number): VNode {
  const boneAngle = angle(bone.vector);
  let rotationToApply = parentRotation;

  if (bone.rotationFormula !== 'a') {
    const s = waveRotation;
    const a = boneAngle;

    rotationToApply += eval(bone.rotationFormula) - boneAngle;
  }

  const position = add(parentPosition, rotate(bone.vector, rotationToApply));

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


function renderSkeleton (bone: Bone, parentPosition: Vector, parentAddress: Address, waveRotation: number, parentRotation: number): VNode[] {
  const boneAngle = angle(bone.vector);
  let rotationToApply = parentRotation;

  if (bone.rotationFormula !== 'a') {
    const s = waveRotation;
    const a = boneAngle;

    rotationToApply += eval(bone.rotationFormula) - boneAngle;
  }

  const position = add(parentPosition, rotate(bone.vector, rotationToApply));
  const address = parentAddress.concat(bone.id);

  return [
    renderBone(bone, parentPosition, address, waveRotation, parentRotation),

    ...flatten(bone.children.map(childBone => renderSkeleton(childBone, position, address, waveRotation, rotationToApply)))
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
    [],
    0,
    0
  );

  return (
    div('.skelemation', [
      h('svg', {attrs: {viewBox, height: 600}}, [
        ...renderedBonesTree,

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
  boneToAddTo.children.push({...newBone, id, children: [], rotationFormula: 'a'});

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
  const fauxRootBone = {children: [bone], vector: {x: 0, y: 0}, id: -1, rotationFormula: 'a'};

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

type AnimatorState = {
  skeleton: Bone,
  waveProgress: number,
  waveLength: number,
  waveFormula: string,
  selectedBoneAddress: null | Address
}

function yAtPoint (formula: string, x: number): number  {
  const code = `
    var x = ${x};

    ${formula};
  `;

  return -eval(code);
};

function renderWavePath (state: AnimatorState, width: number, pixels: number): VNode {
  const points = new Array(pixels).fill(0).map((_, index) => {
    const x = index / pixels * width;

    return `L ${x} ${yAtPoint(state.waveFormula, x)}`;
  });

  return (
    h('path', {
      attrs: {
        d: `M 0 0 ` + points.join(' '),
        stroke: 'skyblue',
        fill: 'none',
        'stroke-width': 0.03
      }
    })
  )
}

function renderRotationFormulaControls (state: AnimatorState): VNode {
  const bone = findBone(state.skeleton, state.selectedBoneAddress as Address);
  return (
    div('.rotation-formula-controls', [
      div('.title', `Rotation formula for ${state.selectedBoneAddress}`),
      input('.rotation-formula', {props: {value: bone.rotationFormula}}),
      pre(JSON.stringify(bone, null, 2))
    ])
  );
}

function updateBone (rootBone: Bone, address: Address, update: Object): Bone {
  const bone = findBone(rootBone, address);

  Object.keys(update).forEach(key => {
    (bone as any)[key] = (update as any)[key];
  });

  return rootBone;
}

function SkeletonAnimator (sources: Sources): Sinks {
  const initialState = {
    skeleton: skellington,
    waveProgress: 0,
    waveLength: 1000,
    waveFormula: 'Math.sin(x)'
  };

  const update$ = sources.Time
    .animationFrames()
    .map(frame => frame.delta)
    .map((delta: number): Reducer<AnimatorState> => (state) => ({...state, waveProgress: state.waveProgress + delta}))

  const changeWaveform$ = sources.DOM
    .select('.wave-formula')
    .events('change')
    .map(ev => (ev.target as HTMLInputElement).value)
    .map((formula: string): Reducer<AnimatorState> => (state) => ({...state, waveFormula: formula}));

  const selectBone$ = sources.DOM
    .select('circle')
    .events('click')
    .map((event: any): Reducer<AnimatorState> => {
      return function (state: AnimatorState): AnimatorState {
        const address = (event.currentTarget as Element).getAttribute('boneAddress');

        state.selectedBoneAddress = (address as string).split(',').map(s => parseInt(s, 10));

        return state;
      }
    });

  const updateBoneRotationFormula$ = sources.DOM
    .select('.rotation-formula')
    .events('change')
    .map(ev => (ev.target as HTMLInputElement).value)
    .map((formula: string): Reducer<AnimatorState> => (state) => ({...state, skeleton: updateBone(state.skeleton, state.selectedBoneAddress as Address, {rotationFormula: formula})}));

  const reducer$ = xs.merge(
    update$,
    changeWaveform$,
    selectBone$,
    updateBoneRotationFormula$
  );

  const state$ = reducer$.fold(applyReducer, initialState);

  function view (state: AnimatorState): VNode {
    const viewBox = `-320 -240 640 480`;
    const waveViewBox = `0 -0.5 ${TAU} 1`;

    const waveProgress = state.waveProgress / state.waveLength % 1;

    const renderedBonesTree = renderSkeleton(
      state.skeleton,
      {x: 0, y: 0},
      [],
      yAtPoint(state.waveFormula, TAU * waveProgress),
      0
    );

    return (
      div('.animator', [
        h('svg', {attrs: {viewBox, height: 600}}, [
          ...renderedBonesTree
        ]),

        div('.waves', [
          h3('s'),
          h('svg', {attrs: {viewBox: waveViewBox, width: 300, height: 200}}, [
            h('line', {
              attrs: {
                x1: 0,
                x2: TAU,
                y1: 0,
                y2: 0,
                stroke: 'gray',
                'stroke-width': 0.01
              }
            }),

            renderWavePath(state, TAU, 300),

            h('line', {
              attrs: {
                x1: TAU * waveProgress,
                x2: TAU * waveProgress,
                y1: -3,
                y2: 3,
                stroke: 'darkgrey',
                'stroke-width': 0.02
              }
            }),
          ]),

          div('.wave-control', [
            `y = `,
            input('.wave-formula', {attrs: {value: state.waveFormula}})
          ]),

          div('.selected-bone', [
            state.selectedBoneAddress ? renderRotationFormulaControls(state) : ''
          ])
        ])
      ])
    )
  }

  return {
    DOM: state$.map(view)
  }
}

function angle (vector: Vector): number {
  return Math.atan2(-vector.y, vector.x);
}

type MainState = {
  mode: 'creating' | 'animating'
}

function main (sources: Sources): Sinks {
  const skeletonCreator = isolate(SkeletonCreator)(sources);
  const skeletonAnimator = isolate(SkeletonAnimator)(sources);

  const initialState : MainState = {
    mode: 'animating'
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
