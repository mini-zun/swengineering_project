import { createId } from './id.js'

export const characterCount = (value) => Array.from(value).length

export function validateSpaceName(spaces, name, excludedId) {
  const trimmed = name.trim()
  if (!trimmed || characterCount(trimmed) > 20) throw new Error('공간 이름은 앞뒤 공백을 제외하고 1~20자로 입력해 주세요.')
  if (spaces.some((space) => space.id !== excludedId && space.name === trimmed)) throw new Error('이미 사용 중인 공간 이름이에요.')
  return trimmed
}

export function emptySpace(name) {
  return { id: createId(), name, links: [], todos: [], memos: [] }
}

export function createDefaultData() {
  const space = emptySpace('기본 공간')
  return { version: 1, spaces: [space], activeSpaceId: space.id, quote: '' }
}

export function createSpace(data, name) {
  const space = emptySpace(validateSpaceName(data.spaces, name))
  return { ...data, spaces: [...data.spaces, space], activeSpaceId: space.id }
}

export function renameSpace(data, id, name) {
  if (!data.spaces.some((space) => space.id === id)) throw new Error('공간을 찾을 수 없어요.')
  const validName = validateSpaceName(data.spaces, name, id)
  return { ...data, spaces: data.spaces.map((space) => space.id === id ? { ...space, name: validName } : space) }
}

export function deleteSpace(data, id) {
  if (data.spaces.length === 1) throw new Error('마지막 공간은 삭제할 수 없어요.')
  const spaces = data.spaces.filter((space) => space.id !== id)
  return { ...data, spaces, activeSpaceId: data.activeSpaceId === id ? spaces[0].id : data.activeSpaceId }
}
