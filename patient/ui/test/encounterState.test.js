import test from 'node:test';
import assert from 'node:assert/strict';
import { isLiveConsultation } from '../src/utils/encounterState.js';

test('consultation navigation starts at queue entry and ends with the encounter', () => {
  for (const encounter of [null, {}, { status: 'OPEN' }, { status: 'OPEN', queue_status: 'INTAKE_PENDING' }]) {
    assert.equal(isLiveConsultation(encounter), false);
  }
  for (const queue_status of ['WAITING', 'DOCTOR_REVIEWING', 'CALLED', 'IN_CONSULTATION']) {
    assert.equal(isLiveConsultation({ status: 'OPEN', queue_status }), true);
    assert.equal(isLiveConsultation({ status: 'CLOSED', queue_status }), false);
  }
});
