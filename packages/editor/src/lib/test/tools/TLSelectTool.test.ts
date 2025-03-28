import { createCustomShapeId } from '@tldraw/tlschema'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

const ids = {
	box1: createCustomShapeId('box1'),
	embed1: createCustomShapeId('embed1'),
}

jest.useFakeTimers()

beforeEach(() => {
	editor = new TestEditor()
	editor
		.selectAll()
		.deleteShapes()
		.createShapes([{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } }])
})

describe('TLSelectTool.Translating', () => {
	it('Enters from pointing and exits to idle', () => {
		const shape = editor.getShapeById(ids.box1)
		editor.pointerDown(150, 150, { target: 'shape', shape })
		editor.expectToBeIn('select.pointing_shape')

		editor.pointerMove(200, 200)
		editor.expectToBeIn('select.translating')

		editor.pointerUp()
		editor.expectToBeIn('select.idle')
	})

	it('Drags a shape', () => {
		const shape = editor.getShapeById(ids.box1)
		editor.pointerDown(150, 150, { target: 'shape', shape })
		editor.pointerMove(200, 200)
		editor.pointerUp()
		editor.expectShapeToMatch({ id: ids.box1, x: 150, y: 150 })
	})

	it('Clones a shape, removes the clone, and re-creates the clone', () => {
		const shape = editor.getShapeById(ids.box1)
		editor.pointerDown(150, 150, { target: 'shape', shape })
		editor.pointerMove(200, 200)

		expect(editor.shapesArray.length).toBe(1)
		editor.expectShapeToMatch({ id: ids.box1, x: 150, y: 150 })
		const t1 = [...editor.shapeIds.values()]

		editor.keyDown('Alt')
		expect(editor.shapesArray.length).toBe(2)
		editor.expectShapeToMatch({ id: ids.box1, x: 100, y: 100 })
		// const t2 = [...editor.shapeIds.values()]

		editor.keyUp('Alt')

		// There's a timer here! We shouldn't end the clone until the timer is done
		expect(editor.shapesArray.length).toBe(2)

		jest.advanceTimersByTime(250) // tick tock

		// Timer is done! We should have ended the clone.
		expect(editor.shapesArray.length).toBe(1)
		editor.expectToBeIn('select.translating')

		editor.expectShapeToMatch({ id: ids.box1, x: 150, y: 150 })

		expect([...editor.shapeIds.values()]).toMatchObject(t1)

		// todo: Should cloning again duplicate new shapes, or restore the last clone?
		// editor.keyDown('Alt')
		// expect(editor.shapesArray.length).toBe(2)
		// editor.expectShapeToMatch({ id: ids.box1, x: 100, y: 100 })
		// expect([...editor.shapeIds.values()]).toMatchObject(t2)
	})

	it('Constrains when holding shift', () => {
		const shape = editor.getShapeById(ids.box1)
		editor.pointerDown(150, 150, { target: 'shape', shape })
		editor.pointerMove(200, 170)
		editor.expectShapeToMatch({ id: ids.box1, x: 150, y: 120 })
		editor.keyDown('Shift')
		editor.expectShapeToMatch({ id: ids.box1, x: 150, y: 100 })
	})

	it('Does not expand selection when holding shift and alt', () => {
		const shape = editor.getShapeById(ids.box1)
		editor.keyDown('Shift')

		// alt-drag to create a copy:
		editor.keyDown('Alt')
		editor.pointerDown(150, 150, { target: 'shape', shape })
		editor.pointerMove(150, 250)
		editor.pointerUp()
		const box2Id = editor.onlySelectedShape!.id
		expect(editor.shapesArray.length).toStrictEqual(2)
		expect(ids.box1).not.toEqual(box2Id)

		// shift-alt-drag the original, we shouldn't duplicate the copy too:
		editor.pointerDown(150, 150, { target: 'shape', shape })
		expect(editor.selectedIds).toStrictEqual([ids.box1])
		editor.pointerMove(250, 150)
		editor.pointerUp()
		expect(editor.shapesArray.length).toStrictEqual(3)
	})
})

describe('PointingHandle', () => {
	it('Enters from idle and exits to idle', () => {
		const shape = editor.getShapeById(ids.box1)
		editor.pointerDown(150, 150, {
			target: 'handle',
			shape,
			handle: { id: 'start', type: 'vertex', index: 'a1', x: 0, y: 0 },
		})
		editor.expectToBeIn('select.pointing_handle')

		editor.pointerUp()
		editor.expectToBeIn('select.idle')
	})

	it('Bails on escape', () => {
		const shape = editor.getShapeById(ids.box1)
		editor.pointerDown(150, 150, {
			target: 'handle',
			shape,
			handle: { id: 'start', type: 'vertex', index: 'a1', x: 0, y: 0 },
		})
		editor.expectToBeIn('select.pointing_handle')
		editor.cancel()
		editor.expectToBeIn('select.idle')
	})
})

describe('DraggingHandle', () => {
	it('Enters from pointing_handle and exits to idle', () => {
		const shape = editor.getShapeById(ids.box1)
		editor.pointerDown(150, 150, {
			target: 'handle',
			shape,
			handle: { id: 'start', type: 'vertex', index: 'a1', x: 0, y: 0 },
		})
		editor.pointerMove(100, 100)
		editor.expectToBeIn('select.dragging_handle')

		editor.pointerUp()
		editor.expectToBeIn('select.idle')
	})

	it('Bails on escape', () => {
		const shape = editor.getShapeById(ids.box1)

		editor.pointerDown(150, 150, {
			target: 'handle',
			shape,
			handle: { id: 'start', type: 'vertex', index: 'a1', x: 0, y: 0 },
		})
		editor.pointerMove(100, 100)
		editor.expectToBeIn('select.dragging_handle')
		editor.cancel()
		editor.expectToBeIn('select.idle')
	})
})

describe('When double clicking a shape', () => {
	it('begins editing a geo shapes label', () => {
		editor
			.selectAll()
			.deleteShapes()
			.selectNone()
			.createShapes([{ id: editor.createShapeId(), type: 'geo' }])
			.doubleClick(50, 50, { target: 'shape', shape: editor.shapesArray[0] })
			.expectToBeIn('select.editing_shape')
	})
})

describe('When pressing enter on a selected shape', () => {
	it('begins editing a geo shapes label', () => {
		const id = editor.createShapeId()
		editor
			.selectAll()
			.deleteShapes()
			.selectNone()
			.createShapes([{ id, type: 'geo' }])
			.select(id)
			.keyUp('Enter')
			.expectToBeIn('select.editing_shape')
	})
})

// it('selects the child of a group', () => {
//   const id1 = editor.createShapeId()
//   const id2 = editor.createShapeId()
//   app
//     .selectAll()
//     .deleteShapes()
//     .selectNone()
//     .createShapes([
//       { id: id1, type: 'geo', x: 100, y: 100 },
//       { id: id2, type: 'geo', x: 200, y: 200 },
//     ])
//     .selectAll()
//     .groupShapes()
//     .doubleClick(50, 50, { target: 'shape', shape: editor.getShapeById(id1) })
//     .expectToBeIn('select.editing_shape')
// })

describe('When double clicking the selection edge', () => {
	it('Resets text scale when double clicking the edge of the text', () => {
		const id = editor.createShapeId()
		editor
			.selectAll()
			.deleteShapes()
			.selectNone()
			.createShapes([{ id, type: 'text', x: 100, y: 100, props: { scale: 2, text: 'hello' } }])
			.select(id)
			.doubleClick(100, 100, { target: 'selection', handle: 'left' })

		editor.expectShapeToMatch({ id, props: { scale: 1 } })
	})

	it('Resets text autosize first when double clicking the edge of the text', () => {
		const id = editor.createShapeId()
		editor
			.selectAll()
			.deleteShapes()
			.selectNone()
			.createShapes([
				{
					id,
					type: 'text',
					props: { scale: 2, autoSize: false, w: 200, text: 'hello' },
				},
			])
			.select(id)
			.doubleClick(100, 100, { target: 'selection', handle: 'left' })

		editor.expectShapeToMatch({ id, props: { scale: 2, autoSize: true } })

		editor.doubleClick(100, 100, { target: 'selection', handle: 'left' })

		editor.expectShapeToMatch({ id, props: { scale: 1, autoSize: true } })
	})

	it('Begins editing the text if handler returns no change', () => {
		const id = editor.createShapeId()
		editor
			.selectAll()
			.deleteShapes()
			.selectNone()
			.createShapes([
				{
					id,
					type: 'text',
					props: { scale: 2, autoSize: false, w: 200, text: 'hello' },
				},
			])
			.select(id)
			.doubleClick(100, 100, { target: 'selection', handle: 'left' })
			.doubleClick(100, 100, { target: 'selection', handle: 'left' })

		expect(editor.editingId).toBe(null)
		editor.expectShapeToMatch({ id, props: { scale: 1, autoSize: true } })

		editor.doubleClick(100, 100, { target: 'selection', handle: 'left' })

		expect(editor.editingId).toBe(id)
	})

	it('Selects a geo shape when double clicking on its edge', () => {
		const id = editor.createShapeId()
		editor
			.selectAll()
			.deleteShapes()
			.selectNone()
			.createShapes([
				{
					id,
					type: 'geo',
				},
			])
			.select(id)
		expect(editor.editingId).toBe(null)

		editor.doubleClick(100, 100, { target: 'selection', handle: 'left' })

		expect(editor.editingId).toBe(id)
	})
})

describe('When editing shapes', () => {
	let ids: any

	beforeEach(() => {
		ids = {
			geo1: editor.createShapeId(),
			geo2: editor.createShapeId(),
			text1: editor.createShapeId(),
			text2: editor.createShapeId(),
		}

		editor.createShapes([
			{ id: ids.geo1, type: 'geo', props: { text: 'hello world ' } },
			{ id: ids.geo2, type: 'geo', props: { text: 'hello world ' } },
			{ id: ids.text1, type: 'text', props: { text: 'hello world ' } },
			{ id: ids.text2, type: 'text', props: { text: 'hello world ' } },
		])
	})

	it('Pointing a shape of a different type selects it and leaves editing', () => {
		expect(editor.editingId).toBe(null)
		expect(editor.selectedIds.length).toBe(0)

		// start editing the geo shape
		editor.doubleClick(50, 50, { target: 'shape', shape: editor.getShapeById(ids.geo1) })
		expect(editor.editingId).toBe(ids.geo1)
		expect(editor.onlySelectedShape?.id).toBe(ids.geo1)
		// point the text shape
		editor.pointerDown(50, 50, { target: 'shape', shape: editor.getShapeById(ids.text1) })
		expect(editor.editingId).toBe(null)
		expect(editor.onlySelectedShape?.id).toBe(ids.text1)
	})

	it('Pointing a shape of a different type selects it and leaves editing', () => {
		expect(editor.editingId).toBe(null)
		expect(editor.selectedIds.length).toBe(0)

		// start editing the geo shape
		editor.doubleClick(50, 50, { target: 'shape', shape: editor.getShapeById(ids.geo1) })
		expect(editor.editingId).toBe(ids.geo1)
		expect(editor.onlySelectedShape?.id).toBe(ids.geo1)
		// point the other geo shape
		editor.pointerDown(50, 50, { target: 'shape', shape: editor.getShapeById(ids.geo2) })
		// that other shape should now be editing and selected!
		expect(editor.editingId).toBe(ids.geo2)
		expect(editor.onlySelectedShape?.id).toBe(ids.geo2)
	})

	it('Works with text, too', () => {
		expect(editor.editingId).toBe(null)
		expect(editor.selectedIds.length).toBe(0)

		// start editing the geo shape
		editor.doubleClick(50, 50, { target: 'shape', shape: editor.getShapeById(ids.text1) })
		editor.pointerDown(50, 50, { target: 'shape', shape: editor.getShapeById(ids.text2) })
		// that other shape should now be editing and selected!
		expect(editor.editingId).toBe(ids.text2)
		expect(editor.onlySelectedShape?.id).toBe(ids.text2)
	})

	it('Double clicking the canvas creates a new text shape', () => {
		expect(editor.editingId).toBe(null)
		expect(editor.selectedIds.length).toBe(0)
		expect(editor.shapesArray.length).toBe(5)
		editor.doubleClick(750, 750)
		expect(editor.shapesArray.length).toBe(6)
		expect(editor.shapesArray[5].type).toBe('text')
	})

	it('It deletes an empty text shape when your click away', () => {
		expect(editor.editingId).toBe(null)
		expect(editor.selectedIds.length).toBe(0)
		expect(editor.shapesArray.length).toBe(5)

		// Create a new shape by double clicking
		editor.doubleClick(750, 750)
		expect(editor.selectedIds.length).toBe(1)
		expect(editor.shapesArray.length).toBe(6)
		const shapeId = editor.selectedIds[0]

		// Click away
		editor.click(1000, 1000)
		expect(editor.selectedIds.length).toBe(0)
		expect(editor.shapesArray.length).toBe(5)
		expect(editor.getShapeById(shapeId)).toBe(undefined)
	})

	it('It deletes an empty text shape when your click another text shape', () => {
		expect(editor.editingId).toBe(null)
		expect(editor.selectedIds.length).toBe(0)
		expect(editor.shapesArray.length).toBe(5)

		// Create a new shape by double clicking
		editor.doubleClick(750, 750)
		expect(editor.selectedIds.length).toBe(1)
		expect(editor.shapesArray.length).toBe(6)
		const shapeId = editor.selectedIds[0]

		// Click another text shape
		editor.click(50, 50, { target: 'shape', shape: editor.getShapeById(ids.text1) })
		expect(editor.selectedIds.length).toBe(1)
		expect(editor.shapesArray.length).toBe(5)
		expect(editor.getShapeById(shapeId)).toBe(undefined)
	})

	it.todo('restores selection after changing styles')
})

describe('When in readonly mode', () => {
	beforeEach(() => {
		editor.createShapes([
			{
				id: ids.embed1,
				type: 'embed',
				x: 100,
				y: 100,
				props: { opacity: '1', w: 100, h: 100, url: '', doesResize: false },
			},
		])
		editor.setReadOnly(true)
		editor.setSelectedTool('select')
	})

	it('Begins editing embed when double clicked', () => {
		expect(editor.editingId).toBe(null)
		expect(editor.selectedIds.length).toBe(0)
		expect(editor.isReadOnly).toBe(true)

		const shape = editor.getShapeById(ids.embed1)
		editor.doubleClick(100, 100, { target: 'shape', shape })
		expect(editor.editingId).toBe(ids.embed1)
	})

	it('Begins editing embed when pressing Enter on a selected embed', () => {
		expect(editor.editingId).toBe(null)
		expect(editor.selectedIds.length).toBe(0)
		expect(editor.isReadOnly).toBe(true)

		editor.setSelectedIds([ids.embed1])
		expect(editor.selectedIds.length).toBe(1)

		editor.keyUp('Enter')
		expect(editor.editingId).toBe(ids.embed1)
	})
})
