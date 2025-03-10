import { createCustomShapeId } from '@tldraw/tlschema'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

const ids = {
	boxA: createCustomShapeId('boxA'),
	boxB: createCustomShapeId('boxB'),
	boxC: createCustomShapeId('boxC'),
	boxD: createCustomShapeId('boxD'),
}

jest.useFakeTimers()

beforeEach(() => {
	editor = new TestEditor()
	editor.selectAll()
	editor.deleteShapes()
	editor.createShapes([
		{
			id: ids.boxA,
			type: 'geo',
			x: 0,
			y: 0,
		},
		{
			id: ids.boxB,
			type: 'geo',
			x: 100,
			y: 100,
		},
		{
			id: ids.boxC,
			type: 'geo',
			x: 400,
			y: 400,
		},
	])
})

describe('editor.packShapes', () => {
	it('packs shapes', () => {
		editor.selectAll()
		const centerBefore = editor.selectionBounds!.center.clone()
		editor.packShapes()
		jest.advanceTimersByTime(1000)
		expect(editor.shapesArray.map((s) => ({ ...s, parentId: 'wahtever' }))).toMatchSnapshot(
			'packed shapes'
		)
		const centerAfter = editor.selectionBounds!.center.clone()
		expect(centerBefore).toMatchObject(centerAfter)
	})

	it('packs rotated shapes', () => {
		editor.updateShapes([{ id: ids.boxA, type: 'geo', rotation: Math.PI }])
		editor.selectAll().packShapes()
		jest.advanceTimersByTime(1000)
		expect(editor.shapesArray.map((s) => ({ ...s, parentId: 'wahtever' }))).toMatchSnapshot(
			'packed shapes'
		)
	})
})
