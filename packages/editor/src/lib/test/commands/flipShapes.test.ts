import { Matrix2d, PI } from '@tldraw/primitives'
import {
	TLArrowShape,
	TLArrowShapeProps,
	TLShapeId,
	TLShapePartial,
	createCustomShapeId,
} from '@tldraw/tlschema'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

jest.useFakeTimers()

const ids = {
	boxA: createCustomShapeId('boxA'),
	boxB: createCustomShapeId('boxB'),
	boxC: createCustomShapeId('boxC'),
	boxD: createCustomShapeId('boxD'),
}

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
			props: {
				w: 100,
				h: 100,
			},
		},
		{
			id: ids.boxB,
			type: 'geo',
			x: 150,
			y: 150,
			props: {
				w: 50,
				h: 50,
			},
		},
		{
			id: ids.boxC,
			type: 'geo',
			x: 300,
			y: 300,
			props: {
				w: 100,
				h: 100,
			},
		},
	])
})

describe('When flipping horizontally', () => {
	it('Flips the selected shapes', () => {
		editor.select(ids.boxA, ids.boxB, ids.boxC)
		editor.mark('flipped')
		editor.flipShapes('horizontal')

		editor.expectShapeToMatch(
			{
				id: ids.boxA,
				type: 'geo',
				x: 300,
			},
			{
				id: ids.boxB,
				type: 'geo',
				x: 200,
			},
			{
				id: ids.boxC,
				type: 'geo',
				x: 0,
			}
		)
	})

	it('Flips the provided shapes', () => {
		editor.mark('flipped')
		editor.flipShapes('horizontal', [ids.boxA, ids.boxB])

		editor.expectShapeToMatch(
			{
				id: ids.boxA,
				type: 'geo',
				x: 100,
			},
			{
				id: ids.boxB,
				type: 'geo',
				x: 0,
			}
		)
	})

	it('Flips rotated shapes', () => {
		editor.updateShapes([{ id: ids.boxA, type: 'geo', rotation: PI }])
		editor.select(ids.boxA, ids.boxB)
		const a = editor.selectedPageBounds
		editor.mark('flipped')
		editor.flipShapes('horizontal')

		const b = editor.selectedPageBounds
		expect(a!).toCloselyMatchObject(b!)

		editor.expectShapeToMatch(
			{
				id: ids.boxA,
				type: 'geo',
				x: 200,
			},
			{
				id: ids.boxB,
				type: 'geo',
				x: -100,
			}
		)
	})

	it('Flips the children of rotated shapes', () => {
		editor.reparentShapesById([ids.boxB], ids.boxA)
		editor.updateShapes([{ id: ids.boxA, type: 'geo', rotation: PI }])
		editor.select(ids.boxB, ids.boxC)
		const a = editor.selectedPageBounds
		editor.mark('flipped')
		editor.flipShapes('horizontal')

		const b = editor.selectedPageBounds
		expect(a).toCloselyMatchObject(b!)
	})
})

describe('When flipping vertically', () => {
	it('Flips the selected shapes', () => {
		editor.select(ids.boxA, ids.boxB, ids.boxC)
		editor.mark('flipped')
		editor.flipShapes('vertical')

		editor.expectShapeToMatch(
			{
				id: ids.boxA,
				type: 'geo',
				y: 300,
			},
			{
				id: ids.boxB,
				type: 'geo',
				y: 200,
			},
			{
				id: ids.boxC,
				type: 'geo',
				y: 0,
			}
		)
	})

	it('Flips the provided shapes', () => {
		editor.mark('flipped')
		editor.flipShapes('vertical', [ids.boxA, ids.boxB])

		editor.expectShapeToMatch(
			{
				id: ids.boxA,
				type: 'geo',
				y: 100,
			},
			{
				id: ids.boxB,
				type: 'geo',
				y: 0,
			}
		)
	})

	it('Flips rotated shapes', () => {
		editor.updateShapes([{ id: ids.boxA, type: 'geo', rotation: PI }])
		editor.select(ids.boxA, ids.boxB)
		const a = editor.selectedPageBounds
		editor.mark('flipped')
		editor.flipShapes('vertical')

		const b = editor.selectedPageBounds
		expect(a).toCloselyMatchObject(b!)
		editor.expectShapeToMatch(
			{
				id: ids.boxA,
				type: 'geo',
				y: 200,
			},
			{
				id: ids.boxB,
				type: 'geo',
				y: -100,
			}
		)
	})

	it('Flips the children of rotated shapes', () => {
		editor.reparentShapesById([ids.boxB], ids.boxA)
		editor.updateShapes([{ id: ids.boxA, type: 'geo', rotation: PI }])
		editor.select(ids.boxB, ids.boxC)
		const a = editor.selectedPageBounds
		editor.mark('flipped')
		editor.flipShapes('vertical')

		const b = editor.selectedPageBounds
		expect(a).toCloselyMatchObject(b!)
	})
})

it('Preserves the selection bounds.', () => {
	editor.selectAll()
	const a = editor.selectedPageBounds
	editor.mark('flipped')
	editor.flipShapes('horizontal')

	const b = editor.selectedPageBounds
	expect(a).toMatchObject(b!)
	editor.mark('flipped')
	editor.flipShapes('vertical')

	const c = editor.selectedPageBounds
	expect(a).toMatchObject(c!)
})

it('Does, undoes and redoes', () => {
	editor.mark('flip vertical')
	editor.flipShapes('vertical', [ids.boxA, ids.boxB])

	editor.expectShapeToMatch(
		{
			id: ids.boxA,
			type: 'geo',
			y: 100,
		},
		{
			id: ids.boxB,
			type: 'geo',
			y: 0,
		}
	)
	editor.undo()
	editor.expectShapeToMatch(
		{
			id: ids.boxA,
			type: 'geo',
			y: 0,
		},
		{
			id: ids.boxB,
			type: 'geo',
			y: 150,
		}
	)
	editor.redo()
	editor.expectShapeToMatch(
		{
			id: ids.boxA,
			type: 'geo',
			y: 100,
		},
		{
			id: ids.boxB,
			type: 'geo',
			y: 0,
		}
	)
})

describe('When multiple shapes are selected', () => {
	it.todo('Flips the shape positions according to the selection rotation')
	it.todo('Flips using the selection rotation when the shapes have a common selection rotation')
	it.todo('Flips using the main axis when shapes do not have a common selection rotation')
	it.todo('Flips when shapes have different parents')
})

describe('When one shape is selected', () => {
	it('Does nothing if the shape is not a group', () => {
		const before = editor.getShapeById(ids.boxA)!
		editor.select(ids.boxA)
		editor.flipShapes('horizontal')

		expect(editor.getShapeById(ids.boxA)).toMatchObject(before)
	})

	it('Flips the direct child shape positions if the shape is a group', async () => {
		const fn = jest.fn()

		editor.selectAll()
		editor.groupShapes() // this will also select the new group
		const groupBefore = editor.selectedShapes[0]
		editor.on('change', fn)
		editor.flipShapes('horizontal')

		// The change event should have been called
		jest.runOnlyPendingTimers()
		expect(fn).toHaveBeenCalled()

		editor.expectShapeToMatch(
			{
				...groupBefore, // group should not have changed
			},
			{
				id: ids.boxA, // group's children shapes should have been flipped
				type: 'geo',
				parentId: groupBefore.id,
				x: 300,
				y: 0,
			},
			{
				id: ids.boxB,
				type: 'geo',
				parentId: groupBefore.id,
				x: 200,
				y: 150,
			},
			{
				id: ids.boxC,
				type: 'geo',
				parentId: groupBefore.id,
				x: 0,
				y: 300,
			}
		)
	})

	it.todo('Flips line and arrow shapes when their parent group is flipped')
})

describe('flipping rotated shapes', () => {
	const arrowLength = 100
	const diamondRadius = Math.cos(Math.PI / 4) * arrowLength

	const topPoint = { x: 0, y: 0 }
	const rightPoint = { x: diamondRadius, y: diamondRadius }
	const bottomPoint = { x: 0, y: 2 * diamondRadius }
	const leftPoint = { x: -diamondRadius, y: diamondRadius }

	const ids = {
		arrowA: createCustomShapeId('arrowA'),
		arrowB: createCustomShapeId('arrowB'),
		arrowC: createCustomShapeId('arrowC'),
		arrowD: createCustomShapeId('arrowD'),
	}
	beforeEach(() => {
		editor.selectAll().deleteShapes()
		const props: Partial<TLArrowShapeProps> = {
			start: {
				type: 'point',
				x: 0,
				y: 0,
			},
			end: {
				type: 'point',
				x: 100,
				y: 0,
			},
		}
		// create a diamond of rotated arrows, pointing clockwise, with the top point at 0,0
		editor.createShapes([
			{
				// top to right
				type: 'arrow',
				id: ids.arrowA,
				...topPoint,
				rotation: Math.PI / 4,
				props,
			},
			{
				// right to bottom
				type: 'arrow',
				id: ids.arrowB,
				...rightPoint,
				rotation: (Math.PI * 3) / 4,
				props,
			},
			{
				// bottom to left
				type: 'arrow',
				id: ids.arrowC,
				...bottomPoint,
				rotation: (Math.PI * 5) / 4,
				props,
			},
			{
				// left to top
				type: 'arrow',
				id: ids.arrowD,
				...leftPoint,
				rotation: (Math.PI * 7) / 4,
				props,
			},
		])

		editor.select(ids.arrowA, ids.arrowB, ids.arrowC, ids.arrowD)
	})

	const getStartAndEndPoints = (id: TLShapeId) => {
		const transform = editor.getPageTransformById(id)
		if (!transform) throw new Error('no transform')
		const arrow = editor.getShapeById<TLArrowShape>(id)!
		if (arrow.props.start.type !== 'point' || arrow.props.end.type !== 'point')
			throw new Error('not a point')
		const start = Matrix2d.applyToPoint(transform, arrow.props.start)
		const end = Matrix2d.applyToPoint(transform, arrow.props.end)
		return { start, end }
	}

	test('flipping horizontally', () => {
		editor.flipShapes('horizontal')
		// now arrow A should be pointing from top to left
		let { start, end } = getStartAndEndPoints(ids.arrowA)
		expect(start).toCloselyMatchObject(topPoint)
		expect(end).toCloselyMatchObject(leftPoint)

		// now arrow B should be pointing from left to bottom
		;({ start, end } = getStartAndEndPoints(ids.arrowB))
		expect(start).toCloselyMatchObject(leftPoint)
		expect(end).toCloselyMatchObject(bottomPoint)

		// now arrow C should be pointing from bottom to right
		;({ start, end } = getStartAndEndPoints(ids.arrowC))
		expect(start).toCloselyMatchObject(bottomPoint)
		expect(end).toCloselyMatchObject(rightPoint)

		// now arrow D should be pointing from right to top
		;({ start, end } = getStartAndEndPoints(ids.arrowD))
		expect(start).toCloselyMatchObject(rightPoint)
		expect(end).toCloselyMatchObject(topPoint)
	})

	test('flipping vertically', () => {
		editor.flipShapes('vertical')
		// arrows that have height 0 get nudged by a pixel when flipped vertically
		// so we need to use a fairly loose tolerance
		// now arrow A should be pointing from bottom to right
		let { start, end } = getStartAndEndPoints(ids.arrowA)
		expect(start).toCloselyMatchObject(bottomPoint, 5)
		expect(end).toCloselyMatchObject(rightPoint, 5)

		// now arrow B should be pointing from right to top
		;({ start, end } = getStartAndEndPoints(ids.arrowB))
		expect(start).toCloselyMatchObject(rightPoint, 5)
		expect(end).toCloselyMatchObject(topPoint, 5)

		// now arrow C should be pointing from top to left
		;({ start, end } = getStartAndEndPoints(ids.arrowC))
		expect(start).toCloselyMatchObject(topPoint, 5)
		expect(end).toCloselyMatchObject(leftPoint, 5)

		// now arrow D should be pointing from left to bottom
		;({ start, end } = getStartAndEndPoints(ids.arrowD))
		expect(start).toCloselyMatchObject(leftPoint, 5)
		expect(end).toCloselyMatchObject(bottomPoint, 5)
	})
})

describe('When flipping shapes that include arrows', () => {
	let shapes: TLShapePartial[]

	beforeEach(() => {
		const box1 = editor.createShapeId()
		const box2 = editor.createShapeId()
		const box3 = editor.createShapeId()

		shapes = [
			{
				id: box1,
				type: 'geo',
				x: 0,
				y: 0,
			},
			{
				id: box2,
				type: 'geo',
				x: 300,
				y: 300,
			},
			{
				id: box3,
				type: 'geo',
				x: 300,
				y: 0,
			},
			{
				id: editor.createShapeId(),
				type: 'arrow',
				x: 50,
				y: 50,
				props: {
					bend: 200,
					start: {
						type: 'binding',
						normalizedAnchor: { x: 0.75, y: 0.75 },
						boundShapeId: box1,
						isExact: false,
					},
					end: {
						type: 'binding',
						normalizedAnchor: { x: 0.25, y: 0.25 },
						boundShapeId: box1,
						isExact: false,
					},
				},
			},
			{
				id: editor.createShapeId(),
				type: 'arrow',
				x: 50,
				y: 50,
				props: {
					bend: -200,
					start: {
						type: 'binding',
						normalizedAnchor: { x: 0.75, y: 0.75 },
						boundShapeId: box1,
						isExact: false,
					},
					end: {
						type: 'binding',
						normalizedAnchor: { x: 0.25, y: 0.25 },
						boundShapeId: box1,
						isExact: false,
					},
				},
			},
			{
				id: editor.createShapeId(),
				type: 'arrow',
				x: 50,
				y: 50,
				props: {
					bend: -200,
					start: {
						type: 'binding',
						normalizedAnchor: { x: 0.75, y: 0.75 },
						boundShapeId: box1,
						isExact: false,
					},
					end: {
						type: 'binding',
						normalizedAnchor: { x: 0.25, y: 0.25 },
						boundShapeId: box3,
						isExact: false,
					},
				},
			},
		]
	})

	it('Flips horizontally', () => {
		editor.selectAll().deleteShapes().createShapes(shapes)

		const boundsBefore = editor.selectionBounds!
		editor.flipShapes('horizontal')
		expect(editor.selectionBounds).toCloselyMatchObject(boundsBefore)
	})

	it('Flips vertically', () => {
		editor.selectAll().deleteShapes().createShapes(shapes)

		const boundsBefore = editor.selectionBounds!
		editor.flipShapes('vertical')
		expect(editor.selectionBounds).toCloselyMatchObject(boundsBefore)
	})
})
