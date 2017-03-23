interface Vector {
  x: number,
  y: number
}

function add (a: Vector, b: Vector): Vector {
  return {
    x: a.x + b.x,
    y: a.y + b.y
  };
}

function subtract (a: Vector, b: Vector): Vector {
  return {
    x: a.x - b.x,
    y: a.y - b.y
  };
}

function multiply (v: Vector, n: number): Vector {
  return {
    x: v.x * n,
    y: v.y * n
  };
}

function normalize (v: Vector): Vector {
  const {x, y} = v;

  const length = pythag(v);

  if (length === 0) {
    return {x: 0, y: 0};
  }

  return {
    x: x / length,
    y: y / length
  };
}

function pythag (v: Vector): number {
  const {x, y} = v;

  return Math.abs(Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)));
}


export {
  Vector,
  add,
  subtract,
  multiply,
  pythag,
  normalize
}
