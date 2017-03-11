import {makeDOMDriver, div} from '@cycle/dom';
import {run} from '@cycle/run';
import xs from 'xstream';

const drivers = {
  DOM: makeDOMDriver('.app')
}

function main (sources) {
  return {
    DOM: xs.of(div('hi'))
  }
}

run(main, drivers);
