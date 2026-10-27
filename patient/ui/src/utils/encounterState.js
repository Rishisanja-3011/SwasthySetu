export function isLiveConsultation(encounter) {
  return encounter?.status === 'OPEN'
    && ['WAITING', 'DOCTOR_REVIEWING', 'CALLED', 'IN_CONSULTATION'].includes(encounter.queue_status);
}
