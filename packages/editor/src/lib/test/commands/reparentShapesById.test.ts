import { createCustomShapeId } from '@tldraw/tlschema'
import { createDefaultShapes, defaultShapesIds, TestEditor } from '../TestEditor'

let editor: TestEditor

const ids = {
	...defaultShapesIds,
	box3: createCustomShapeId('box3'),
	box4: createCustomShapeId('box4'),
	box5: createCustomShapeId('box5'),
}

beforeEach(() => {
	editor = new TestEditor()
	editor.createShapes(createDefaultShapes())
	editor.createShapes([
		{
			id: ids.box3,
			type: 'geo',
		},
		{
			id: ids.box4,
			type: 'geo',
		},
		{
			id: ids.box5,
			type: 'geo',
		},
	])
})

it('reparents a shape', () => {
	expect(editor.getShapeById(ids.box2)!.parentId).toBe(editor.currentPageId)
	editor.reparentShapesById([ids.box2], ids.box1)
	expect(editor.getShapeById(ids.box2)!.parentId).toBe(ids.box1)
	editor.reparentShapesById([ids.box2], editor.currentPageId)
	expect(editor.getShapeById(ids.box2)!.parentId).toBe(editor.currentPageId)
})

it('preserves shape page transfors', () => {
	const before = editor.getShapeById(ids.box1)!
	const A = editor.getPageTransformById(ids.box1)
	const A1 = editor.getTransform(before)
	editor.reparentShapesById([ids.box2], ids.box1)

	const after = editor.getShapeById(ids.box1)!
	const B = editor.getPageTransformById(ids.box1)!
	const B1 = editor.getTransform(after)
	expect(A1).toMatchObject(B1)
	expect(A).toMatchObject(B)
})

it('adds children to the top of the parents children by default', () => {
	expect(editor.getShapeById(ids.box2)!.index).toBe('a2')
	expect(editor.getShapeById(ids.box3)!.index).toBe('a3')
	expect(editor.getShapeById(ids.box4)!.index).toBe('a4')

	editor.reparentShapesById([ids.box2, ids.box3], ids.box1)

	// Set the index based on the current children

	// When moving to an empty shape, start at a0
	expect(editor.getShapeById(ids.box2)!.index).toBe('a1')
	expect(editor.getShapeById(ids.box3)!.index).toBe('a2')

	editor.reparentShapesById([ids.box2], editor.currentPageId)

	// When moving back, place at the top of the stack
	expect(editor.getShapeById(ids.box2)!.index).toBe('a6')
})

it('adds children at a given index', () => {
	expect(editor.getShapeById(ids.box1)!.index).toBe('a1')
	expect(editor.getShapeById(ids.box2)!.index).toBe('a2')
	expect(editor.getShapeById(ids.box3)!.index).toBe('a3')
	expect(editor.getShapeById(ids.box4)!.index).toBe('a4')
	expect(editor.getShapeById(ids.box5)!.index).toBe('a5')

	// Page
	// - box1 a1
	// - box2 a2
	//   - ellipse1 a1
	// - box3 a3
	// - box4 a4
	// - box5 a5

	editor.reparentShapesById([ids.box2], ids.box1)

	// Page
	// - box1 a1
	//   - box2 a1
	//     - ellipse1 a1
	// - box3 a3
	// - box4 a4
	// - box5 a5

	// Set the index based on the current children

	// When moving to an empty shape, start at a1
	expect(editor.getShapeById(ids.box1)!.index).toBe('a1')
	expect(editor.getShapeById(ids.box2)!.index).toBe('a1')
	expect(editor.getShapeById(ids.box3)!.index).toBe('a3')
	expect(editor.getShapeById(ids.box4)!.index).toBe('a4')
	expect(editor.getShapeById(ids.box5)!.index).toBe('a5')
	expect(editor.getShapeById(ids.ellipse1)!.index).toBe('a1')

	// Handles collisions (trying to move box3 to a0, but box2 is there already)
	editor.reparentShapesById([ids.box3], ids.box1, 'a1')

	// Page
	// - box1 a1
	//   - box2 a1
	//     - ellipse1 a1
	//   - box3 a2
	// - box4 a4
	// - box5 a5

	expect(editor.getShapeById(ids.box1)!.index).toBe('a1')
	expect(editor.getShapeById(ids.box2)!.index).toBe('a1')
	expect(editor.getShapeById(ids.box3)!.index).toBe('a2')
	expect(editor.getShapeById(ids.box4)!.index).toBe('a4')
	expect(editor.getShapeById(ids.box5)!.index).toBe('a5')
	expect(editor.getShapeById(ids.ellipse1)!.index).toBe('a1')

	// Handles collisions (trying to move box5 to a0, but box2 is there already)
	// should end up between box 2 and box 3 (a0 and a1)
	editor.reparentShapesById([ids.box5], ids.box1, 'a1')

	// Page
	// - box1 a1
	//   - box2 a1
	//     - ellipse1 a1
	//   - box5 a1V
	//   - box3 a2
	// - box4 a2

	expect(editor.getShapeById(ids.box1)!.index).toBe('a1')
	expect(editor.getShapeById(ids.box2)!.index).toBe('a1')
	expect(editor.getShapeById(ids.box3)!.index).toBe('a2')
	expect(editor.getShapeById(ids.box4)!.index).toBe('a4')
	expect(editor.getShapeById(ids.box5)!.index).toBe('a1V')
	expect(editor.getShapeById(ids.ellipse1)!.index).toBe('a1')

	// Handles collisions (trying to move boxes 2, 3, and 5 to a0, but box1 is there already)
	// Should order them between box1 and box4
	editor.reparentShapesById([ids.box2, ids.box3, ids.box5], editor.currentPageId, 'a1')

	// Page
	// - box1 a1
	// - box2 a1V
	//   - ellipse1 a1
	// - box3 a2
	// - box5 a3
	// - box4 a4

	expect(editor.getShapeById(ids.box1)!.index).toBe('a1')
	expect(editor.getShapeById(ids.box2)!.index).toBe('a1V')
	expect(editor.getShapeById(ids.box3)!.index).toBe('a2')
	expect(editor.getShapeById(ids.box4)!.index).toBe('a4')
	expect(editor.getShapeById(ids.box5)!.index).toBe('a3')
	expect(editor.getShapeById(ids.ellipse1)!.index).toBe('a1')
})
