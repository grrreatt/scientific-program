import { ensurePersonByNameOrId } from '@/lib/utils'

test('returns id when UUID provided', async () => {
  const id = '550e8400-e29b-41d4-a716-446655440000'
  const supa = {}
  const result = await ensurePersonByNameOrId(supa as any, [], id)
  expect(result).toBe(id)
})

test('resolves from existing list by name (case-insensitive)', async () => {
  const supa = {}
  const result = await ensurePersonByNameOrId(supa as any, [{ id: '1', name: 'Alice' }], 'alice')
  expect(result).toBe('1')
})

test('creates when not found', async () => {
  const supa = {
    from: () => ({
      insert: () => ({ select: () => ({ single: async () => ({ data: { id: '2', name: 'Bob' } }) }) })
    })
  }
  const created: any[] = []
  const id = await ensurePersonByNameOrId(supa as any, [], 'Bob', p => created.push(p))
  expect(id).toBe('2')
  expect(created[0]).toEqual({ id: '2', name: 'Bob' })
})


