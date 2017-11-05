import * as QUnit from 'qunit';
import music21 from '../../src/loadModules';

const interval = music21.interval;
const Interval = music21.interval.Interval;

export default function tests() {
    QUnit.test('music21.interval.intervalFromGenericAndChromatic', assert => {
        let i;
        i = interval.intervalFromGenericAndChromatic(2, 2);
        assert.equal(i.name, 'M2');
    });
    QUnit.test('music21.interval.Interval', assert => {
        let i;
        i = new Interval('P5');
        assert.equal(i.name, 'P5', 'name passed');
        assert.equal(i.niceName, 'Perfect Fifth', 'nice name passed');
        assert.equal(i.generic.simpleDirected, 5);
    });
}
