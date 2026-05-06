export const SERVICE_DISPLAY_NAMES = {
  'Aircon Maintenance': 'Aircon Services',
  'Aircon Cleaning': 'Aircon Services',
  'Plumbing Repair': 'Plumbing',
}

export const toDisplayName = (name) => SERVICE_DISPLAY_NAMES[name] ?? name
