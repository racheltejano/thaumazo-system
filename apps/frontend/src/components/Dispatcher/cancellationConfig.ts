// Cancellation reasons and configuration for dispatcher
export const DISPATCHER_CANCELLATION_REASONS = {
  past_date_unassigned: {
    label: 'Order Date Passed (Unassigned)',
    description: 'The scheduled pickup date has passed without driver assignment.',
    emailMessage: 'Unfortunately, your scheduled pickup date has passed and we were unable to assign a driver to your order.',
    requiresInput: false,
    automatic: true, // Used in auto-assign
  },
  no_drivers_available: {
    label: 'No Drivers Available',
    description: 'No drivers are available for the requested time slot.',
    emailMessage: 'We regret to inform you that we do not have drivers available for your requested pickup time.',
    requiresInput: false,
    automatic: false,
  },
  client_requested: {
    label: 'Client Requested Cancellation',
    description: 'Cancellation requested by the client.',
    emailMessage: 'As per your request, we have cancelled your order.',
    requiresInput: false,
    automatic: false,
  },
  route_conflict: {
    label: 'Route Conflict',
    description: 'Order conflicts with existing route assignments.',
    emailMessage: 'Due to routing constraints, we are unable to fulfill your order at the requested time.',
    requiresInput: false,
    automatic: false,
  },
  other: {
    label: 'Other Reason',
    description: 'Please specify the cancellation reason.',
    emailMessage: '', // Will be filled by dispatcher
    requiresInput: true,
    automatic: false,
  },
} as const

export type CancellationReasonKey = keyof typeof DISPATCHER_CANCELLATION_REASONS

// Get manual cancellation reasons (excludes automatic ones)
export function getManualCancellationReasons() {
  return Object.entries(DISPATCHER_CANCELLATION_REASONS)
    .filter(([_, config]) => !config.automatic)
    .map(([key, config]) => ({
      value: key as CancellationReasonKey,
      label: config.label,
      description: config.description,
    }))
}

// Get email message for a cancellation reason
export function getCancellationEmailMessage(
  reason: CancellationReasonKey,
  customMessage?: string
): string {
  const config = DISPATCHER_CANCELLATION_REASONS[reason]
  
  if (config.requiresInput && customMessage) {
    return customMessage
  }
  
  return config.emailMessage
}