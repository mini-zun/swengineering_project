export const SIZE_PRESETS = ['s', 'm', 'l']
export const SIZE_LABELS = { s: '작게', m: '보통', l: '크게' }
export const DEFAULT_SIZE = 'm'

export const isSizePreset = (value) => SIZE_PRESETS.includes(value)
