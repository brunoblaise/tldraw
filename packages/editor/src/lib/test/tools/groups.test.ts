import { sortByIndex } from '@tldraw/indices'
import { approximately, Box2d, VecLike } from '@tldraw/primitives'
import {
	createCustomShapeId,
	TLArrowShape,
	TLGroupShape,
	TLLineShape,
	TLShape,
	TLShapeId,
	TLShapePartial,
} from '@tldraw/tlschema'
import { assert, compact } from '@tldraw/utils'
import { TLArrowUtil } from '../../app/shapeutils/TLArrowUtil/TLArrowUtil'
import { TLGroupUtil } from '../../app/shapeutils/TLGroupUtil/TLGroupUtil'
import { TLArrowTool } from '../../app/statechart/TLArrowTool/TLArrowTool'
import { TLDrawTool } from '../../app/statechart/TLDrawTool/TLDrawTool'
import { TLEraserTool } from '../../app/statechart/TLEraserTool/TLEraserTool'
import { TLLineTool } from '../../app/statechart/TLLineTool/TLLineTool'
import { TLNoteTool } from '../../app/statechart/TLNoteTool/TLNoteTool'
import { TestEditor } from '../TestEditor'

jest.mock('nanoid', () => {
	let i = 0
	return { nanoid: () => 'id' + i++ }
})

const ids = {
	boxA: createCustomShapeId('boxA'),
	boxB: createCustomShapeId('boxB'),
	boxC: createCustomShapeId('boxC'),
	boxD: createCustomShapeId('boxD'),
	boxE: createCustomShapeId('boxE'),
	boxF: createCustomShapeId('boxF'),

	boxX: createCustomShapeId('boxX'),

	lineA: createCustomShapeId('lineA'),
}

const box = (id: TLShapeId, x: number, y: number, w = 10, h = 10): TLShapePartial => ({
	type: 'geo',
	id,
	x,
	y,
	// index: bumpIndex(),
	props: {
		w,
		h,
		fill: 'solid',
	},
})
const arrow = (id: TLShapeId, start: VecLike, end: VecLike): TLShapePartial => ({
	type: 'arrow',
	id,
	// index: bumpIndex(),
	props: {
		start: {
			type: 'point',
			x: start.x,
			y: start.y,
		},
		end: {
			type: 'point',
			x: end.x,
			y: end.y,
		},
	},
})
const randomRotation = () => Math.random() * Math.PI * 2
const randomCoord = () => Math.random() * 100 - 50
const randomSize = () => Math.random() * 99 + 1

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})
afterEach(() => {
	editor?.dispose()
})

const getAllShapes = () => editor.shapesArray

const onlySelectedId = () => {
	expect(editor.selectedIds).toHaveLength(1)
	return editor.selectedIds[0]
}

const onlySelectedShape = () => {
	const id = onlySelectedId()
	return editor.getShapeById(id)!
}

const children = (shape: TLShape) => {
	return new Set(compact(editor.getSortedChildIds(shape.id).map((id) => editor.getShapeById(id))))
}

const isRemoved = (shape: TLShape) => {
	return !editor.getShapeById(shape.id)
}

describe('creating groups', () => {
	it('works if there are multiple shapes in the selection', () => {
		// 0   10  20  30  40  50
		// ┌───┐   ┌───┐   ┌───┐
		// │ A │   │ B │   │ C │
		// └───┘   └───┘   └───┘
		editor.createShapes([box(ids.boxA, 0, 0), box(ids.boxB, 20, 0), box(ids.boxC, 40, 0)])

		editor.select(ids.boxA, ids.boxB)
		expect(getAllShapes()).toHaveLength(3)
		expect(editor.selectedIds.length).toBe(2)

		editor.groupShapes()

		expect(getAllShapes()).toHaveLength(4)
		expect(editor.selectedIds.length).toBe(1)
		expect(editor.getShapeById(ids.boxA)).toBeTruthy()
		expect(editor.getShapeById(ids.boxB)).toBeTruthy()

		const group = onlySelectedShape()
		expect(group.type).toBe(TLGroupUtil.type)
		expect(editor.getPageBoundsById(group.id)!).toCloselyMatchObject({ x: 0, y: 0, w: 30, h: 10 })
		expect(children(group).has(editor.getShapeById(ids.boxA)!)).toBe(true)
		expect(children(group).has(editor.getShapeById(ids.boxB)!)).toBe(true)
		expect(children(group).has(editor.getShapeById(ids.boxC)!)).toBe(false)
	})
	it('does not work if there are zero or one shape in the selection ', () => {
		// 0   10  20  30  40  50
		// ┌───┐   ┌───┐   ┌───┐
		// │ A │   │ B │   │ C │
		// └───┘   └───┘   └───┘
		editor.createShapes([box(ids.boxA, 0, 0), box(ids.boxB, 20, 0), box(ids.boxC, 40, 0)])
		expect(getAllShapes()).toHaveLength(3)
		editor.groupShapes()
		expect(getAllShapes()).toHaveLength(3)
		editor.select(ids.boxA)
		editor.groupShapes()
		expect(getAllShapes()).toHaveLength(3)
		expect(onlySelectedId()).toBe(ids.boxA)
	})

	it('preserves the page positions and rotations of the grouped shapes', () => {
		for (let i = 0; i < 100; i++) {
			const shapes = [
				{
					...box(ids.boxA, randomCoord(), randomCoord(), randomSize(), randomSize()),
					rotation: randomRotation(),
				},
				{
					...box(ids.boxB, randomCoord(), randomCoord(), randomSize(), randomSize()),
					rotation: randomRotation(),
				},
				{
					...box(ids.boxC, randomCoord(), randomCoord(), randomSize(), randomSize()),
					rotation: randomRotation(),
				},
			]
			editor.createShapes(shapes)

			const initialPageBounds = {
				A: editor.getPageBoundsById(ids.boxA)!.clone(),
				B: editor.getPageBoundsById(ids.boxB)!.clone(),
				C: editor.getPageBoundsById(ids.boxC)!.clone(),
			}

			const initialPageRotations = {
				A: editor.getPageRotationById(ids.boxA),
				B: editor.getPageRotationById(ids.boxB),
				C: editor.getPageRotationById(ids.boxC),
			}

			editor.select(ids.boxA, ids.boxB, ids.boxC)
			editor.groupShapes()

			try {
				expect({
					A: editor.getPageBoundsById(ids.boxA)!.clone(),
					B: editor.getPageBoundsById(ids.boxB)!.clone(),
					C: editor.getPageBoundsById(ids.boxC)!.clone(),
				}).toCloselyMatchObject(initialPageBounds)
				expect({
					A: editor.getPageRotationById(ids.boxA),
					B: editor.getPageRotationById(ids.boxB),
					C: editor.getPageRotationById(ids.boxC),
				}).toCloselyMatchObject(initialPageRotations)
			} catch (e) {
				console.error('Failing nodes', JSON.stringify(shapes))
				throw e
			}
		}
	})
	it('works with nested groups', () => {
		// 0   10  20  30  40  50  60  70
		// ┌───┐   ┌───┐   ┌───┐   ┌───┐
		// │ A │   │ B │   │ C │   │ D │
		// └───┘   └───┘   └───┘   └───┘
		editor.createShapes([
			box(ids.boxA, 0, 0),
			box(ids.boxB, 20, 0),
			box(ids.boxC, 40, 0),
			box(ids.boxD, 60, 0),
		])

		editor.select(ids.boxA, ids.boxB)
		editor.groupShapes()

		const groupAId = onlySelectedId()

		editor.select(ids.boxC, ids.boxD)
		editor.groupShapes()

		const groupBId = onlySelectedId()

		editor.select(groupAId, groupBId)
		editor.groupShapes()

		const uberGroup = onlySelectedShape()
		expect(uberGroup.type).toBe(TLGroupUtil.type)
		expect(editor.getPageBoundsById(uberGroup.id)!).toCloselyMatchObject({
			x: 0,
			y: 0,
			w: 70,
			h: 10,
		})

		expect(children(uberGroup).size).toBe(2)
		expect(children(uberGroup).has(editor.getShapeById(groupAId)!)).toBe(true)
		expect(children(uberGroup).has(editor.getShapeById(groupBId)!)).toBe(true)
	})
	it('works with shapes inside individual nested groups', () => {
		//     0   10  20  30  40  50  60  70  80  90  100 110
		//
		//     ┌───┐           ┌───┐   ┌───┐           ┌───┐
		//     │ A │           │ C │   │ D │           │ F │
		// 10  └───┘           └───┘   └───┘           └───┘
		//
		// 20          ┌───┐                   ┌───┐
		//             │ B │                   │ E │
		// 30          └───┘                   └───┘
		editor.createShapes([
			box(ids.boxA, 0, 0),
			box(ids.boxB, 20, 20),
			box(ids.boxC, 40, 0),
			box(ids.boxD, 60, 0),
			box(ids.boxE, 80, 20),
			box(ids.boxF, 100, 0),
		])

		editor.select(ids.boxA, ids.boxB, ids.boxC)
		editor.groupShapes()
		const groupA = onlySelectedShape()
		editor.select(ids.boxD, ids.boxE, ids.boxF)
		editor.groupShapes()
		const groupB = onlySelectedShape()

		editor.select(ids.boxB, ids.boxE)
		editor.groupShapes()
		const groupC = onlySelectedShape()

		expect(children(groupA).size).toBe(2)
		expect(children(groupB).size).toBe(2)
		expect(children(groupC).size).toBe(2)

		expect(groupA.parentId).toBe(editor.currentPageId)
		expect(groupB.parentId).toBe(editor.currentPageId)
		expect(groupC.parentId).toBe(editor.currentPageId)

		expect(editor.getShapeById(ids.boxA)!.parentId).toBe(groupA.id)
		expect(editor.getShapeById(ids.boxC)!.parentId).toBe(groupA.id)

		expect(editor.getShapeById(ids.boxB)!.parentId).toBe(groupC.id)
		expect(editor.getShapeById(ids.boxE)!.parentId).toBe(groupC.id)

		expect(editor.getShapeById(ids.boxD)!.parentId).toBe(groupB.id)
		expect(editor.getShapeById(ids.boxF)!.parentId).toBe(groupB.id)
	})
	it('does not work if the scene is in readonly mode', () => {
		// 0   10  20  30  40  50
		// ┌───┐   ┌───┐   ┌───┐
		// │ A │   │ B │   │ C │
		// └───┘   └───┘   └───┘
		editor.createShapes([box(ids.boxA, 0, 0), box(ids.boxB, 20, 0), box(ids.boxC, 40, 0)])
		editor.setReadOnly(true)
		editor.selectAll()
		expect(editor.selectedIds.length).toBe(3)
		editor.groupShapes()
		expect(editor.selectedIds.length).toBe(3)
	})
	it('keeps order correct simple', () => {
		// 0   10  20  30  40  50  60  70
		// ┌───┐   ┌───┐   ┌───┐   ┌───┐
		// │ A │   │ B │   │ C │   │ D │
		// └───┘   └───┘   └───┘   └───┘
		editor.createShapes([
			box(ids.boxA, 0, 0),
			box(ids.boxB, 20, 0),
			box(ids.boxC, 40, 0),
			box(ids.boxD, 60, 0),
		])

		editor.select(ids.boxC, ids.boxB)
		editor.groupShapes()

		const groupAId = onlySelectedId()
		const sortedGroupChildrenIds = editor
			.getSortedChildIds(groupAId)
			.map((id) => editor.getShapeById(id)!)
			.sort(sortByIndex)
			.map((shape) => shape.id)

		const sortedIds = editor.getSortedChildIds(editor.currentPageId)
		expect(sortedIds.length).toBe(3)
		expect(sortedIds[0]).toBe(ids.boxA)
		expect(sortedIds[1]).toBe(groupAId)
		expect(sortedIds[2]).toBe(ids.boxD)

		expect(sortedGroupChildrenIds.length).toBe(2)
		expect(sortedGroupChildrenIds[0]).toBe(ids.boxB)
		expect(sortedGroupChildrenIds[1]).toBe(ids.boxC)
	})

	it('keeps order correct complex', () => {
		// 0   10  20  30  40  50  60  70
		// ┌───┐   ┌───┐   ┌───┐   ┌───┐
		// │ A │   │ B │   │ C │   │ D │
		// └───┘   └───┘   └───┘   └───┘
		editor.createShapes([
			box(ids.boxA, 0, 0),
			box(ids.boxB, 20, 0),
			box(ids.boxC, 40, 0),
			box(ids.boxD, 60, 0),
		])

		editor.select(ids.boxC, ids.boxA)
		editor.groupShapes()

		const groupAId = onlySelectedId()

		const sortedGroupChildrenIds = editor
			.getSortedChildIds(groupAId)
			.map((id) => editor.getShapeById(id)!)
			.sort(sortByIndex)
			.map((shape) => shape.id)

		const sortedIds = editor.getSortedChildIds(editor.currentPageId)
		expect(sortedIds.length).toBe(3)
		expect(sortedIds[0]).toBe(ids.boxB)
		expect(sortedIds[1]).toBe(groupAId)
		expect(sortedIds[2]).toBe(ids.boxD)

		expect(sortedGroupChildrenIds.length).toBe(2)
		expect(sortedGroupChildrenIds[0]).toBe(ids.boxA)
		expect(sortedGroupChildrenIds[1]).toBe(ids.boxC)
	})
})

describe('ungrouping shapes', () => {
	it('works if there is one selected shape and that shape is a group', () => {
		// 0   10  20  30  40  50
		// ┌───┐   ┌───┐   ┌───┐
		// │ A │   │ B │   │ C │
		// └───┘   └───┘   └───┘
		editor.createShapes([box(ids.boxA, 0, 0), box(ids.boxB, 20, 0), box(ids.boxC, 40, 0)])

		editor.select(ids.boxA, ids.boxB)
		editor.groupShapes()

		const groupA = onlySelectedShape()

		editor.ungroupShapes()

		expect(isRemoved(groupA)).toBe(true)
		expect(new Set(editor.selectedIds)).toEqual(new Set([ids.boxA, ids.boxB]))

		expect(editor.getPageBoundsById(ids.boxA)!).toCloselyMatchObject({
			x: 0,
			y: 0,
			w: 10,
			h: 10,
		})

		expect(editor.getPageBoundsById(ids.boxB)!).toCloselyMatchObject({
			x: 20,
			y: 0,
			w: 10,
			h: 10,
		})
	})
	it('selects the groups children and other non-group shapes on ungroup', () => {
		editor.createShapes([box(ids.boxA, 0, 0), box(ids.boxB, 20, 0), box(ids.boxC, 40, 0)])
		editor.select(ids.boxA, ids.boxB)
		editor.groupShapes()

		const groupA = onlySelectedShape()

		editor.select(groupA.id, ids.boxC)
		editor.ungroupShapes()

		expect(new Set(editor.selectedIds)).toMatchObject(new Set([ids.boxA, ids.boxB, ids.boxC]))
	})
	it('preserves the page positions and rotations of the ungrouped shapes', () => {
		for (let i = 0; i < 100; i++) {
			const shapes = [
				{
					...box(ids.boxA, randomCoord(), randomCoord(), randomSize(), randomSize()),
					rotation: randomRotation(),
				},
				{
					...box(ids.boxB, randomCoord(), randomCoord(), randomSize(), randomSize()),
					rotation: randomRotation(),
				},
				{
					...box(ids.boxC, randomCoord(), randomCoord(), randomSize(), randomSize()),
					rotation: randomRotation(),
				},
			]

			editor.createShapes(shapes)

			const initialPageBounds = {
				A: editor.getPageBoundsById(ids.boxA)!.clone(),
				B: editor.getPageBoundsById(ids.boxB)!.clone(),
				C: editor.getPageBoundsById(ids.boxC)!.clone(),
			}

			const initialPageRotations = {
				A: editor.getPageRotationById(ids.boxA),
				B: editor.getPageRotationById(ids.boxB),
				C: editor.getPageRotationById(ids.boxC),
			}

			editor.select(ids.boxA, ids.boxB, ids.boxC)
			editor.groupShapes()
			editor.ungroupShapes()
			expect(editor.selectedIds.length).toBe(3)

			try {
				expect({
					A: editor.getPageBoundsById(ids.boxA)!.clone(),
					B: editor.getPageBoundsById(ids.boxB)!.clone(),
					C: editor.getPageBoundsById(ids.boxC)!.clone(),
				}).toCloselyMatchObject(initialPageBounds)
				expect({
					A: editor.getPageRotationById(ids.boxA),
					B: editor.getPageRotationById(ids.boxB),
					C: editor.getPageRotationById(ids.boxC),
				}).toCloselyMatchObject(initialPageRotations)
			} catch (e) {
				console.error('Failing shapes', JSON.stringify(shapes))
				throw e
			}
		}
	})
	it('does not ungroup nested groups', () => {
		// 0   10  20  30  40  50  60  70
		// ┌───┐   ┌───┐   ┌───┐   ┌───┐
		// │ A │   │ B │   │ C │   │ D │
		// └───┘   └───┘   └───┘   └───┘
		editor.createShapes([
			box(ids.boxA, 0, 0),
			box(ids.boxB, 20, 0),
			box(ids.boxC, 40, 0),
			box(ids.boxD, 60, 0),
		])

		editor.select(ids.boxA, ids.boxB)
		editor.groupShapes()

		const groupAId = onlySelectedId()

		editor.select(ids.boxC, ids.boxD)
		editor.groupShapes()

		const groupBId = onlySelectedId()

		editor.select(groupAId, groupBId)
		editor.groupShapes()
		expect(editor.selectedIds.length).toBe(1)
		editor.ungroupShapes()
		expect(editor.selectedIds.length).toBe(2)
		expect(editor.getShapeById(groupAId)).not.toBe(undefined)
		expect(editor.getShapeById(groupBId)).not.toBe(undefined)
	})
	it('does not work if the scene is in readonly mode', () => {
		// 0   10  20  30  40  50
		// ┌───┐   ┌───┐   ┌───┐
		// │ A │   │ B │   │ C │
		// └───┘   └───┘   └───┘
		editor.createShapes([box(ids.boxA, 0, 0), box(ids.boxB, 20, 0), box(ids.boxC, 40, 0)])
		editor.selectAll()
		expect(editor.selectedIds.length).toBe(3)
		editor.groupShapes()
		expect(editor.selectedIds.length).toBe(1)
		editor.setReadOnly(true)

		editor.ungroupShapes()
		expect(editor.selectedIds.length).toBe(1)
		expect(onlySelectedShape().type).toBe(TLGroupUtil.type)
	})
	it('keeps order correct simple', () => {
		// 0   10  20  30  40  50  60  70
		// ┌───┐   ┌───┐   ┌───┐   ┌───┐
		// │ A │   │ B │   │ C │   │ D │
		// └───┘   └───┘   └───┘   └───┘
		editor.createShapes([
			box(ids.boxA, 0, 0),
			box(ids.boxB, 20, 0),
			box(ids.boxC, 40, 0),
			box(ids.boxD, 60, 0),
		])

		editor.select(ids.boxC, ids.boxB)
		editor.groupShapes()
		editor.ungroupShapes()

		const sortedShapes = editor.shapesArray.sort(sortByIndex).map((shape) => shape.id)
		expect(sortedShapes.length).toBe(4)
		expect(sortedShapes[0]).toBe(ids.boxA)
		expect(sortedShapes[1]).toBe(ids.boxB)
		expect(sortedShapes[2]).toBe(ids.boxC)
		expect(sortedShapes[3]).toBe(ids.boxD)
	})
	it('keeps order correct complex', () => {
		// 0   10  20  30  40  50  60  70
		// ┌───┐   ┌───┐   ┌───┐   ┌───┐
		// │ A │   │ B │   │ C │   │ D │
		// └───┘   └───┘   └───┘   └───┘
		editor.createShapes([
			box(ids.boxA, 0, 0),
			box(ids.boxB, 20, 0),
			box(ids.boxC, 40, 0),
			box(ids.boxD, 60, 0),
		])

		editor.select(ids.boxC, ids.boxA)
		editor.groupShapes()
		editor.ungroupShapes()

		const sortedShapes = editor.shapesArray.sort(sortByIndex).map((shape) => shape.id)
		expect(sortedShapes.length).toBe(4)
		expect(sortedShapes[0]).toBe(ids.boxB)
		expect(sortedShapes[1]).toBe(ids.boxA)
		expect(sortedShapes[2]).toBe(ids.boxC)
		expect(sortedShapes[3]).toBe(ids.boxD)
	})
})

describe('the bounds of a group', () => {
	it('changes when the children rotate', () => {
		editor.createShapes([
			box(ids.boxA, 0, 0, 100, 100),
			{
				id: ids.boxB,
				type: 'geo',
				x: 200,
				y: 200,
				props: {
					geo: 'ellipse',
					w: 100,
					h: 100,
				},
			},
		])

		editor.select(ids.boxA, ids.boxB)
		editor.groupShapes()
		const group = onlySelectedShape()

		expect(editor.getPageBoundsById(group.id)!.minX).toBe(0)

		editor.select(ids.boxA).rotateSelection(Math.PI / 4)

		// pythagoras to the rescue
		const expectedLeftBound = 50 - Math.sqrt(2 * (100 * 100)) / 2
		expect(editor.getPageBoundsById(group.id)!.minX).toBeCloseTo(expectedLeftBound)

		// rotating the circle doesn't move the right edge because it's outline doesn't change
		expect(editor.getPageBoundsById(group.id)!.maxX).toBe(300)
		editor.select(ids.boxB).rotateSelection(Math.PI / 4)
		expect(approximately(editor.getPageBoundsById(group.id)!.maxX, 300, 1)).toBe(true)
	})

	it('changes when shapes translate', () => {
		// 0   10  20  30  40  50
		// ┌───┐   ┌───┐   ┌───┐
		// │ A │   │ B │   │ C │
		// └───┘   └───┘   └───┘
		editor.createShapes([box(ids.boxA, 0, 0), box(ids.boxB, 20, 0), box(ids.boxC, 40, 0)])

		editor.select(ids.boxA, ids.boxB, ids.boxC)
		editor.groupShapes()
		const group = onlySelectedShape()

		expect(editor.getPageBoundsById(group.id)!).toCloselyMatchObject({
			x: 0,
			y: 0,
			w: 50,
			h: 10,
		})

		// move A to the left
		editor.select(ids.boxA).translateSelection(-10, 0)
		expect(editor.getPageBoundsById(group.id)!).toCloselyMatchObject({
			x: -10,
			y: 0,
			w: 60,
			h: 10,
		})
		// move C up and to the right
		editor.select(ids.boxC).translateSelection(10, -10)
		expect(editor.getPageBoundsById(group.id)!).toCloselyMatchObject({
			x: -10,
			y: -10,
			w: 70,
			h: 20,
		})
	})

	it('changes when shapes resize', () => {
		// 0   10  20  30  40  50
		// ┌───┐   ┌───┐   ┌───┐
		// │ A │   │ B │   │ C │
		// └───┘   └───┘   └───┘
		editor.createShapes([box(ids.boxA, 0, 0), box(ids.boxB, 20, 0), box(ids.boxC, 40, 0)])

		editor.select(ids.boxA, ids.boxB, ids.boxC)
		editor.groupShapes()
		const group = onlySelectedShape()

		expect(editor.getPageBoundsById(group.id)!).toCloselyMatchObject({
			x: 0,
			y: 0,
			w: 50,
			h: 10,
		})

		// resize A to the left
		editor.select(ids.boxA).resizeSelection({ scaleX: 2 }, 'left')
		expect(editor.getPageBoundsById(group.id)!).toCloselyMatchObject({
			x: -10,
			y: 0,
			w: 60,
			h: 10,
		})
		// resize C up and to the right
		editor.select(ids.boxC).resizeSelection({ scaleY: 2, scaleX: 2 }, 'top_right')
		expect(editor.getPageBoundsById(group.id)!).toCloselyMatchObject({
			x: -10,
			y: -10,
			w: 70,
			h: 20,
		})
	})
})

describe('the bounds of a rotated group', () => {
	it('changes when the children rotate', () => {
		editor.createShapes([
			box(ids.boxA, 0, 0, 100, 100),
			{
				id: ids.boxB,
				type: 'geo',
				x: 200,
				y: 200,
				props: {
					geo: 'ellipse',
					w: 100,
					h: 100,
				},
			},
		])

		editor.select(ids.boxA, ids.boxB)
		editor.groupShapes()
		const group = onlySelectedShape()

		editor.rotateSelection(Math.PI / 2)

		expect(editor.getPageBoundsById(group.id)!).toCloselyMatchObject({
			x: 0,
			y: 0,
			w: 300,
			h: 300,
		})

		editor.select(ids.boxA).rotateSelection(Math.PI / 4)

		// pythagoras to the rescue
		const expectedTopBound = 50 - Math.sqrt(2 * (100 * 100)) / 2
		expect(editor.getPageBoundsById(group.id)!.minY).toBeCloseTo(expectedTopBound)

		// rotating the circle doesn't move the right edge because it's outline doesn't change
		expect(editor.getPageBoundsById(group.id)!.maxY).toBe(300)
		editor.select(ids.boxB).rotateSelection(Math.PI / 4)
		expect(approximately(editor.getPageBoundsById(group.id)!.maxY, 300, 1)).toBe(true)
	})

	it('changes when shapes translate', () => {
		// 0   10  20  30  40  50
		// ┌───┐   ┌───┐   ┌───┐
		// │ A │   │ B │   │ C │
		// └───┘   └───┘   └───┘
		// rotate this all 90 degrees
		editor.createShapes([box(ids.boxA, 0, 0), box(ids.boxB, 20, 0), box(ids.boxC, 40, 0)])

		editor.select(ids.boxA, ids.boxB, ids.boxC)
		editor.groupShapes()
		const group = onlySelectedShape()
		editor.updateShapes([{ id: group.id, type: 'group', rotation: Math.PI / 2, x: 10, y: 0 }])

		expect(editor.getPageBoundsById(group.id)!).toCloselyMatchObject({
			x: 0,
			y: 0,
			w: 10,
			h: 50,
		})

		// move A up and to the left
		editor.select(ids.boxA).translateSelection(-10, -10)
		expect(editor.getPageBoundsById(group.id)!).toCloselyMatchObject({
			x: -10,
			y: -10,
			w: 20,
			h: 60,
		})
		// move C up and to the right
		editor.select(ids.boxC).translateSelection(10, -10)
		expect(editor.getPageBoundsById(group.id)!).toCloselyMatchObject({
			x: -10,
			y: -10,
			w: 30,
			h: 50,
		})
	})

	it('changes when shapes resize', () => {
		// 0   10  20  30  40  50
		// ┌───┐   ┌───┐   ┌───┐
		// │ A │   │ B │   │ C │
		// └───┘   └───┘   └───┘
		// rotate this all 90 degrees
		editor.createShapes([box(ids.boxA, 0, 0), box(ids.boxB, 20, 0), box(ids.boxC, 40, 0)])

		editor.select(ids.boxA, ids.boxB, ids.boxC)
		editor.groupShapes()
		const group = onlySelectedShape()
		editor.updateShapes([{ id: group.id, type: 'group', rotation: Math.PI / 2, x: 10, y: 0 }])

		expect(editor.getPageBoundsById(group.id)!).toCloselyMatchObject({
			x: 0,
			y: 0,
			w: 10,
			h: 50,
		})

		// resize A to up
		editor.select(ids.boxA).resizeSelection({ scaleX: 2 }, 'left')
		expect(editor.getPageBoundsById(group.id)!).toCloselyMatchObject({
			x: 0,
			y: -10,
			w: 10,
			h: 60,
		})
		// resize C up and to the right
		editor.select(ids.boxC).resizeSelection({ scaleY: 2, scaleX: 2 }, 'top_right')
		expect(editor.getPageBoundsById(group.id)!).toCloselyMatchObject({
			x: 0,
			y: -10,
			w: 20,
			h: 70,
		})
	})
})

describe('focus layers', () => {
	let groupAId: TLShapeId
	let groupBId: TLShapeId
	let groupCId: TLShapeId
	beforeEach(() => {
		//  group C
		// ┌─────────────────────────────────────────────────────────┐
		// │ group A                         group B                 │
		// │ ┌────────────────────────┐     ┌──────────────────────┐ │
		// │ │  ┌───┐          ┌───┐  │     │ ┌───┐          ┌───┐ │ │
		// │ │  │ A │          │ B │  │     │ │ C │          │ D │ │ │
		// │ │  └───┘          └───┘  │     │ └───┘          └───┘ │ │
		// │ └────────────────────────┘     └──────────────────────┘ │
		// └─────────────────────────────────────────────────────────┘
		editor.createShapes([
			box(ids.boxA, 0, 0),
			box(ids.boxB, 20, 0),
			box(ids.boxC, 40, 0),
			box(ids.boxD, 60, 0),
		])
		editor.select(ids.boxA, ids.boxB)
		editor.groupShapes()
		groupAId = onlySelectedId()
		editor.select(ids.boxC, ids.boxD)
		editor.groupShapes()
		groupBId = onlySelectedId()
		editor.select(groupAId, groupBId)
		editor.groupShapes()
		groupCId = onlySelectedId()
		editor.selectNone()
	})
	it('should adjust to the parent layer of any selected shape', () => {
		expect(editor.focusLayerId).toBe(editor.currentPageId)
		editor.select(ids.boxA)
		expect(editor.focusLayerId).toBe(groupAId)
		editor.select(ids.boxB)
		expect(editor.focusLayerId).toBe(groupAId)
		editor.select(ids.boxC)
		expect(editor.focusLayerId).toBe(groupBId)
		editor.select(ids.boxD)
		expect(editor.focusLayerId).toBe(groupBId)
		editor.select(groupAId)
		expect(editor.focusLayerId).toBe(groupCId)
	})
	it('should adjust to the common ancestor of selected shapes in multiple groups', () => {
		expect(editor.focusLayerId).toBe(editor.currentPageId)
		editor.select(ids.boxA)
		expect(editor.focusLayerId).toBe(groupAId)
		editor.setSelectedIds([...editor.selectedIds, ids.boxC])
		expect(editor.focusLayerId).toBe(groupCId)
		editor.deselect(ids.boxA)
		expect(editor.focusLayerId).toBe(groupBId)
		editor.setSelectedIds([...editor.selectedIds, ids.boxB])
		expect(editor.focusLayerId).toBe(groupCId)
	})
	it('should not adjust the focus layer when clearing the selection', () => {
		expect(editor.focusLayerId).toBe(editor.currentPageId)
		editor.select(ids.boxA)
		expect(editor.focusLayerId).toBe(groupAId)
		editor.deselect(ids.boxA)
		expect(editor.focusLayerId).toBe(groupAId)
		editor.select(ids.boxB, ids.boxC)
		expect(editor.focusLayerId).toBe(groupCId)
		editor.selectNone()
		expect(editor.focusLayerId).toBe(groupCId)
	})
})

describe('the select tool', () => {
	let groupAId: TLShapeId
	let groupBId: TLShapeId
	let groupCId: TLShapeId
	beforeEach(() => {
		//  group C
		// ┌─────────────────────────────────────────────────────────┐
		// │ group A                         group B                 │
		// │ ┌────────────────────────┐     ┌──────────────────────┐ │
		// │ │  0             20      │     │ 40            60     │ │
		// │ │  ┌───┐          ┌───┐  │     │ ┌───┐          ┌───┐ │ │
		// │ │  │ A │          │ B │  │     │ │ C │          │ D │ │ │
		// │ │  └───┘          └───┘  │     │ └───┘          └───┘ │ │
		// │ └────────────────────────┘     └──────────────────────┘ │
		// └─────────────────────────────────────────────────────────┘
		editor.createShapes([
			box(ids.boxA, 0, 0),
			box(ids.boxB, 20, 0),
			box(ids.boxC, 40, 0),
			box(ids.boxD, 60, 0),
		])
		editor.select(ids.boxA, ids.boxB)
		editor.groupShapes()
		groupAId = onlySelectedId()
		editor.select(ids.boxC, ids.boxD)
		editor.groupShapes()
		groupBId = onlySelectedId()
		editor.select(groupAId, groupBId)
		editor.groupShapes()
		groupCId = onlySelectedId()
		editor.selectNone()
	})

	it('should select the outermost non-selected group when you click on one of the shapes in that group', () => {
		editor.pointerDown(0, 0, ids.boxA).pointerUp(0, 0)
		expect(onlySelectedId()).toBe(groupCId)
		expect(editor.focusLayerId).toBe(editor.currentPageId)
		editor.pointerDown(0, 0, ids.boxA)
		editor.pointerUp(0, 0, ids.boxA)
		expect(onlySelectedId()).toBe(groupAId)
		expect(editor.focusLayerId).toBe(groupCId)
		editor.pointerDown(0, 0, ids.boxA).pointerUp(0, 0, ids.boxA)
		expect(onlySelectedId()).toBe(ids.boxA)
		expect(editor.focusLayerId).toBe(groupAId)
	})

	it('should select the outermost non-selected group when you right-click on one of the shapes in that group', () => {
		const boxA = editor.getShapeById(ids.boxA)

		editor
			.pointerDown(0, 0, { target: 'shape', shape: boxA, button: 2 })
			.pointerUp(0, 0, { button: 2 })
		expect(onlySelectedId()).toBe(groupCId)
		expect(editor.focusLayerId).toBe(editor.currentPageId)
		editor
			.pointerDown(0, 0, { target: 'shape', shape: boxA, button: 2 })
			.pointerUp(0, 0, { button: 2 })
		expect(onlySelectedId()).toBe(groupAId)
		expect(editor.focusLayerId).toBe(groupCId)
		editor
			.pointerDown(0, 0, { target: 'shape', shape: boxA, button: 2 })
			.pointerUp(0, 0, { button: 2 })
		expect(onlySelectedId()).toBe(ids.boxA)
		expect(editor.focusLayerId).toBe(groupAId)
	})

	it('should allow to shift-select other shapes outside of the current focus layer', () => {
		editor.pointerDown(0, 0, ids.boxA).pointerUp(0, 0)
		editor.pointerDown(0, 0, ids.boxA).pointerUp(0, 0)
		editor.pointerDown(0, 0, ids.boxA).pointerUp(0, 0)
		expect(onlySelectedId()).toBe(ids.boxA)
		expect(editor.focusLayerId).toBe(groupAId)

		editor
			.pointerDown(40, 0, ids.boxC, { shiftKey: true })
			.pointerUp(0, 0, ids.boxC, { shiftKey: true })
		expect(editor.selectedIds.includes(ids.boxA)).toBe(true)
		expect(editor.selectedIds.includes(groupBId)).toBe(true)
		expect(editor.focusLayerId).toBe(groupCId)

		editor.pointerDown(40, 0, ids.boxC, { shiftKey: true }).pointerUp(0, 0)
		expect(editor.selectedIds.includes(ids.boxA)).toBe(true)
		expect(editor.selectedIds.includes(groupBId)).toBe(false)
		expect(editor.selectedIds.includes(ids.boxC)).toBe(true)
		expect(editor.focusLayerId).toBe(groupCId)
	})

	it('if a shape inside a focused group is selected and you click outside the group it should clear the selection and focus the page', () => {
		editor.select(ids.boxA)
		expect(editor.focusLayerId).toBe(groupAId)

		// click outside the focused group, but inside another group
		editor.pointerDown(35, 5, { target: 'canvas' }).pointerUp(35, 5)
		expect(editor.focusLayerId).toBe(editor.currentPageId)
		expect(editor.selectedIds).toHaveLength(0)

		editor.select(ids.boxA)
		expect(editor.focusLayerId).toBe(groupAId)

		// click the empty canvas
		editor.pointerDown(35, 50, { target: 'canvas' }).pointerUp(35, 50)
		expect(editor.focusLayerId).toBe(editor.currentPageId)
		expect(editor.selectedIds).toHaveLength(0)
	})

	it('if a shape inside a focused group is selected and you click an empty space inside the group it should deselect the shape', () => {
		editor.select(ids.boxA)
		expect(editor.focusLayerId).toBe(groupAId)

		editor.pointerDown(15, 5, groupAId).pointerUp(15, 5, groupAId)
		expect(editor.focusLayerId).toBe(groupAId)
		expect(editor.selectedIds.length).toBe(0)
	})

	it('if you click inside the empty space of a focused group while there are no selected shapes, it should pop the focus layer and select the group', () => {
		editor.select(ids.boxA)
		editor.pointerDown(15, 5, groupAId).pointerUp(15, 5, groupAId)
		expect(editor.focusLayerId).toBe(groupAId)
		expect(editor.selectedIds.length).toBe(0)
		editor.pointerDown(15, 5, groupAId).pointerUp(15, 5, groupAId)
		expect(editor.focusLayerId).toBe(groupCId)
		expect(onlySelectedId()).toBe(groupAId)
	})

	it('should pop the focus layer when escape is pressed in idle state', () => {
		editor.select(ids.boxA)
		expect(editor.selectedIds).toMatchObject([ids.boxA]) // box1
		expect(editor.focusLayerId).toBe(groupAId)
		// deselct
		editor.cancel()
		expect(editor.selectedIds).toMatchObject([groupAId]) // groupA
		expect(editor.focusLayerId).toBe(groupCId)
		// pop focus layer
		editor.cancel()
		expect(editor.selectedIds.length).toBe(1) // Group C
		expect(editor.focusLayerId).toBe(editor.currentPageId)
		editor.cancel()
		expect(editor.selectedIds.length).toBe(0)
		expect(editor.focusLayerId).toBe(editor.currentPageId)
	})

	describe('brushing', () => {
		// ! Removed: pointing a group is impossible; you'd be pointing the selection instead.
		// it('should work while focused in a group if you start the drag from within the group', () => {
		// 	editor.select(ids.boxA)
		// 	editor.pointerDown(15, 5, groupAId).pointerMove(25, 9, ids.boxB)
		// 	expect(editor.root.path.value).toBe(`root.select.brushing`)
		// 	expect(editor.selectedIds.includes(ids.boxA)).toBe(false)
		// 	expect(editor.selectedIds.includes(ids.boxB)).toBe(true)

		// 	editor.keyDown('Shift')
		// 	expect(editor.selectedIds.includes(ids.boxA)).toBe(true)
		// 	expect(editor.selectedIds.includes(ids.boxB)).toBe(true)
		// })

		it('should work while focused in a group if you start the drag from outside of the group', () => {
			editor.select(ids.boxA)
			editor
				.pointerDown(15, -5, { target: 'canvas' }, { shiftKey: true })
				.pointerMove(25, 9, ids.boxB, { shiftKey: true })

			expect(editor.root.path.value).toBe(`root.select.brushing`)
			expect(editor.selectedIds.includes(ids.boxA)).toBe(true)
			expect(editor.selectedIds.includes(ids.boxB)).toBe(true)

			editor.keyUp('Shift')
			jest.advanceTimersByTime(200)

			expect(editor.selectedIds.includes(ids.boxA)).toBe(false)
			expect(editor.selectedIds.includes(ids.boxB)).toBe(true)
		})

		it('should not select the group until you hit one of its child shapes', () => {
			//             ┌────┐
			//  group C    │    │
			// ┌───────────┼────┼────────────────────────────────────────┐
			// │ group A   │    │                group B                 │
			// │ ┌─────────┼────┼─────────┐     ┌──────────────────────┐ │
			// │ │  ┌───┐  │    │  ┌───┐  │     │ ┌───┐          ┌───┐ │ │
			// │ │  │ A │  │    │  │ B │  │     │ │ C │          │ D │ │ │
			// │ │  └───┘  │    │  └───┘  │     │ └───┘          └───┘ │ │
			// │ └─────────┼────┼─────────┘     └──────────────────────┘ │
			// └───────────┼────┼────────────────────────────────────────┘
			//             │    │
			//             └────┘
			//                  ▲
			//                  │ mouse selection
			editor.pointerDown(12.5, -5, undefined).pointerMove(17.5, 15, ids.boxB)
			expect(editor.selectedIds.length).toBe(0)
			editor.pointerMove(25, 15)
			expect(onlySelectedId()).toBe(groupCId)
		})
	})
})

describe("when a group's children are deleted", () => {
	let groupAId: TLShapeId
	let groupBId: TLShapeId
	let groupCId: TLShapeId
	beforeEach(() => {
		//  group C
		// ┌─────────────────────────────────────────────────────────┐
		// │ group A                         group B                 │
		// │ ┌────────────────────────┐     ┌──────────────────────┐ │
		// │ │  0             20      │     │ 40            60     │ │
		// │ │  ┌───┐          ┌───┐  │     │ ┌───┐          ┌───┐ │ │
		// │ │  │ A │          │ B │  │     │ │ C │          │ D │ │ │
		// │ │  └───┘          └───┘  │     │ └───┘          └───┘ │ │
		// │ └────────────────────────┘     └──────────────────────┘ │
		// └─────────────────────────────────────────────────────────┘
		editor.createShapes([
			box(ids.boxA, 0, 0),
			box(ids.boxB, 20, 0),
			box(ids.boxC, 40, 0),
			box(ids.boxD, 60, 0),
		])
		editor.select(ids.boxA, ids.boxB)
		editor.groupShapes()
		groupAId = onlySelectedId()
		editor.select(ids.boxC, ids.boxD)
		editor.groupShapes()
		groupBId = onlySelectedId()
		editor.select(groupAId, groupBId)
		editor.groupShapes()
		groupCId = onlySelectedId()
		editor.selectNone()
	})

	it('should ungroup if there is only one shape left', () => {
		editor.deleteShapes([ids.boxD])
		expect(editor.getShapeById(groupBId)).toBeUndefined()
		expect(editor.getShapeById(ids.boxC)?.parentId).toBe(groupCId)
	})

	it('should remove the group if there are no shapes left', () => {
		editor.deleteShapes([ids.boxC, ids.boxD])
		expect(editor.getShapeById(groupBId)).toBeUndefined()
		expect(editor.getShapeById(groupCId)).toBeUndefined()
		expect(editor.getShapeById(groupAId)).not.toBeUndefined()
	})
})

describe('creating new shapes', () => {
	let groupA: TLGroupShape
	beforeEach(() => {
		// group A
		// ┌──────────────────────────────┐
		// │      0   10         90   100 │
		// │      ┌───┐                   │
		// │      │ A │                   │
		// │  10  └───┘                   │
		// │                              │
		// │                              │
		// │                              │
		// │                              │
		// │  90                  ┌───┐   │
		// │                      │ B │   │
		// │ 100                  └───┘   │
		// └──────────────────────────────┘
		editor.createShapes([box(ids.boxA, 0, 0), box(ids.boxB, 90, 90)])
		editor.select(ids.boxA, ids.boxB)
		editor.groupShapes()
		groupA = onlySelectedShape() as TLGroupShape
		editor.selectNone()
	})
	describe('boxes', () => {
		it('does not create inside the group if the group is only selected and not focused', () => {
			editor.select(groupA.id)
			editor.setSelectedTool('geo')
			editor.pointerDown(20, 20).pointerMove(80, 80).pointerUp(80, 80)
			const boxC = onlySelectedShape()

			expect(boxC.parentId).toBe(editor.currentPageId)
			expect(editor.getPageBoundsById(boxC.id)).toCloselyMatchObject({
				x: 20,
				y: 20,
				w: 60,
				h: 60,
			})
		})

		it('does create inside the group if the group is focused', () => {
			editor.select(ids.boxA)
			expect(editor.focusLayerId === groupA.id).toBe(true)

			editor.setSelectedTool('geo')
			editor.pointerDown(20, 20).pointerMove(80, 80).pointerUp(80, 80)
			const boxC = onlySelectedShape()

			expect(boxC.parentId).toBe(groupA.id)
			expect(editor.getPageBoundsById(boxC.id)).toCloselyMatchObject({
				x: 20,
				y: 20,
				w: 60,
				h: 60,
			})
			expect(editor.focusLayerId === groupA.id).toBe(true)
		})

		it('will reisze the group appropriately if the new shape changes the group bounds', () => {
			editor.select(ids.boxA)
			expect(editor.focusLayerId === groupA.id).toBe(true)

			editor.setSelectedTool('geo')
			editor.pointerDown(20, 20).pointerMove(-10, -10)

			expect(editor.getPageBoundsById(groupA.id)).toCloselyMatchObject({
				x: -10,
				y: -10,
				w: 110,
				h: 110,
			})
			editor.pointerMove(-20, -20).pointerUp(-20, -20)
			expect(editor.getPageBoundsById(groupA.id)).toCloselyMatchObject({
				x: -20,
				y: -20,
				w: 120,
				h: 120,
			})
			const boxC = onlySelectedShape()
			expect(editor.getPageBoundsById(boxC.id)).toCloselyMatchObject({
				x: -20,
				y: -20,
				w: 40,
				h: 40,
			})
		})

		it('works if the shape drawing begins outside of the current group bounds', () => {
			editor.select(ids.boxA)
			expect(editor.focusLayerId === groupA.id).toBe(true)

			editor.setSelectedTool('geo')
			editor.pointerDown(-50, -50).pointerMove(-100, -100).pointerUp()

			expect(editor.getPageBoundsById(groupA.id)).toCloselyMatchObject({
				x: -100,
				y: -100,
				w: 200,
				h: 200,
			})

			const boxC = onlySelectedShape()
			expect(editor.getPageBoundsById(boxC.id)).toCloselyMatchObject({
				x: -100,
				y: -100,
				w: 50,
				h: 50,
			})
		})
	})

	describe('pencil', () => {
		it('does not draw inside the group if the group is only selected and not focused', () => {
			editor.select(groupA.id)

			editor.setSelectedTool(TLDrawTool.id)
			editor.pointerDown(20, 20).pointerMove(80, 80).pointerUp(80, 80)

			const lineC = onlySelectedShape()
			expect(lineC.parentId).toBe(editor.currentPageId)
		})

		it('does draw inside the group if the group is focused', () => {
			editor.select(ids.boxA)
			expect(editor.focusLayerId === groupA.id).toBe(true)

			editor.setSelectedTool(TLDrawTool.id)
			editor.pointerDown(20, 20).pointerMove(80, 80).pointerUp(80, 80)

			const lineC = onlySelectedShape()
			expect(lineC.parentId).toBe(groupA.id)
		})

		it('will resize the group appropriately if the new shape changes the group bounds', () => {
			editor.select(ids.boxA)
			expect(editor.focusLayerId === groupA.id).toBe(true)

			editor.setSelectedTool(TLDrawTool.id)
			editor.pointerDown(20, 20)
			for (let i = 20; i >= -20; i--) {
				editor.pointerMove(i, i)
			}
			editor.pointerUp()

			const roundToNearestTen = (vals: Box2d) => {
				return {
					x: Math.round(vals.x / 10) * 10,
					y: Math.round(vals.y / 10) * 10,
					w: Math.round(vals.w / 10) * 10,
					h: Math.round(vals.h / 10) * 10,
				}
			}

			expect(roundToNearestTen(editor.getPageBoundsById(groupA.id)!)).toCloselyMatchObject({
				x: -20,
				y: -20,
				w: 120,
				h: 120,
			})
		})

		it('works if the shape drawing begins outside of the current group bounds', () => {
			editor.select(ids.boxA)
			expect(editor.focusLayerId === groupA.id).toBe(true)

			editor.setSelectedTool(TLDrawTool.id)
			editor.pointerDown(-20, -20)
			for (let i = -20; i >= -100; i--) {
				editor.pointerMove(i, i)
			}
			editor.pointerUp()

			const roundToNearestTen = (vals: Box2d) => {
				return {
					x: Math.round(vals.x / 10) * 10,
					y: Math.round(vals.y / 10) * 10,
					w: Math.round(vals.w / 10) * 10,
					h: Math.round(vals.h / 10) * 10,
				}
			}

			expect(roundToNearestTen(editor.getPageBoundsById(groupA.id)!)).toCloselyMatchObject({
				x: -100,
				y: -100,
				w: 200,
				h: 200,
			})
		})

		describe('lines', () => {
			it('does not draw inside the group if the group is only selected and not focused', () => {
				editor.select(groupA.id)

				editor.setSelectedTool(TLLineTool.id)
				editor.pointerDown(20, 20)
				editor.pointerMove(80, 80)
				editor.pointerUp(80, 80)

				const lineC = onlySelectedShape()
				expect(lineC.type).toBe('line')
				expect(lineC.parentId).toBe(editor.currentPageId)
			})

			it('does draw inside the group if the group is focused', () => {
				editor.select(ids.boxA)
				expect(editor.focusLayerId === groupA.id).toBe(true)

				editor.setSelectedTool(TLLineTool.id)
				editor.pointerDown(20, 20).pointerMove(80, 80).pointerUp(80, 80)

				const lineC = onlySelectedShape() as TLLineShape
				expect(lineC.type).toBe('line')
				expect(lineC.parentId).toBe(groupA.id)
			})

			it('will reisze the group appropriately if the new shape changes the group bounds', () => {
				editor.select(ids.boxA)
				expect(editor.focusLayerId === groupA.id).toBe(true)

				editor.setSelectedTool(TLLineTool.id)
				editor.pointerDown(20, 20).pointerMove(-10, -10)

				expect(editor.getPageBoundsById(groupA.id)).toMatchSnapshot('group with line shape')
				editor.pointerMove(-20, -20).pointerUp(-20, -20)
				expect(editor.getPageBoundsById(groupA.id)).toMatchSnapshot(
					'group shape after second resize'
				)
				const boxC = onlySelectedShape()
				expect(editor.getPageBoundsById(boxC.id)).toMatchSnapshot('box shape after second resize')
			})

			it('works if the shape drawing begins outside of the current group bounds', () => {
				editor.select(ids.boxA)
				expect(editor.focusLayerId === groupA.id).toBe(true)

				editor.setSelectedTool(TLLineTool.id)
				editor.pointerDown(-50, -50).pointerMove(-100, -100).pointerUp()

				expect(editor.getPageBoundsById(groupA.id)).toMatchSnapshot('group with line')

				const boxC = onlySelectedShape()
				expect(editor.getPageBoundsById(boxC.id)).toMatchSnapshot('box shape after resize')
			})
		})

		describe('sticky notes', () => {
			it('does not draw inside the group if the group is only selected and not focused', () => {
				editor.select(groupA.id)
				expect(editor.focusLayerId === editor.currentPageId).toBe(true)

				editor.setSelectedTool(TLNoteTool.id)
				editor.pointerDown(20, 20).pointerUp()

				const postit = onlySelectedShape()
				expect(postit.parentId).toBe(editor.currentPageId)
			})

			it('does draw inside the group if the group is focused', () => {
				editor.select(ids.boxA)
				expect(editor.focusLayerId === groupA.id).toBe(true)

				editor.setSelectedTool(TLNoteTool.id)
				editor.pointerDown(20, 20).pointerUp()

				const postit = onlySelectedShape()
				expect(postit.parentId).toBe(groupA.id)
			})

			it('will reisze the group appropriately if the new shape changes the group bounds', () => {
				editor.select(ids.boxA)
				expect(editor.focusLayerId === groupA.id).toBe(true)

				expect(editor.getPageBoundsById(groupA.id)).toCloselyMatchObject({
					x: 0,
					y: 0,
					w: 100,
					h: 100,
				})

				editor.setSelectedTool(TLNoteTool.id)
				editor.pointerDown(80, 80)
				editor.pointerUp()
				// default size is 200x200, and it centers it, so add 100px around the pointer
				expect(editor.getPageBoundsById(groupA.id)).toCloselyMatchObject({
					x: -20,
					y: -20,
					w: 200,
					h: 200,
				})

				editor.pointerMove(20, 20)
				editor.pointerUp(20, 20)
				expect(editor.getPageBoundsById(groupA.id)).toCloselyMatchObject({
					x: -20,
					y: -20,
					w: 200,
					h: 200,
				})
			})

			it('works if the shape drawing begins outside of the current group bounds', () => {
				editor.select(ids.boxA)
				expect(editor.focusLayerId === groupA.id).toBe(true)

				editor.setSelectedTool(TLNoteTool.id)
				expect(editor.getPageBoundsById(groupA.id)).toCloselyMatchObject({
					x: 0,
					y: 0,
					w: 100,
					h: 100,
				})
				editor.pointerDown(-20, -20).pointerUp(-20, -20)
				expect(editor.getPageBoundsById(groupA.id)).toCloselyMatchObject({
					x: -120,
					y: -120,
					w: 220,
					h: 220,
				})
			})
		})
	})
})

describe('erasing', () => {
	let groupAId: TLShapeId
	let groupBId: TLShapeId
	let groupCId: TLShapeId
	beforeEach(() => {
		//  group C
		// ┌─────────────────────────────────────────────────────────┐
		// │ group A                         group B                 │
		// │ ┌────────────────────────┐     ┌──────────────────────┐ │
		// │ │  0             20      │     │ 40            60     │ │
		// │ │  ┌───┐          ┌───┐  │     │ ┌───┐          ┌───┐ │ │
		// │ │  │ A │          │ B │  │     │ │ C │          │ D │ │ │
		// │ │  └───┘          └───┘  │     │ └───┘          └───┘ │ │
		// │ └────────────────────────┘     └──────────────────────┘ │
		// └─────────────────────────────────────────────────────────┘
		//
		//  20  ┌───┐
		//      │ E │
		//      └───┘
		editor.createShapes([
			box(ids.boxA, 0, 0),
			box(ids.boxB, 20, 0),
			box(ids.boxC, 40, 0),
			box(ids.boxD, 60, 0),
			box(ids.boxE, 0, 20),
		])
		editor.select(ids.boxA, ids.boxB)
		editor.groupShapes()
		groupAId = onlySelectedId()
		editor.select(ids.boxC, ids.boxD)
		editor.groupShapes()
		groupBId = onlySelectedId()
		editor.select(groupAId, groupBId)
		editor.groupShapes()
		groupCId = onlySelectedId()
		editor.selectNone()
	})

	it('erases whole groups if you hit one of their shapes', () => {
		editor.setSelectedTool(TLEraserTool.id)

		// erase D
		editor.pointerDown(65, 5, ids.boxD)
		expect(editor.pageState.erasingIds.length).toBe(1)
		expect(editor.pageState.erasingIds[0]).toBe(groupCId)
		editor.pointerUp()
		expect(editor.getShapeById(groupCId)).toBeFalsy()
	})

	it('does not erase whole groups if you do not hit on one of their shapes', () => {
		editor.setSelectedTool(TLEraserTool.id)

		editor.pointerDown(35, 5)
		expect(editor.erasingIdsSet.size).toBe(0)
	})

	it('works inside of groups', () => {
		editor.select(ids.boxA)
		expect(editor.focusLayerId === groupAId).toBe(true)
		const groupA = editor.getShapeById(groupAId)!

		editor.setSelectedTool(TLEraserTool.id)

		// erase B
		editor.pointerDown(25, 5, ids.boxB)
		expect(editor.pageState.erasingIds.length).toBe(1)
		expect(editor.pageState.erasingIds[0]).toBe(ids.boxB)
		editor.pointerUp()

		// group A disappears
		expect(isRemoved(groupA)).toBe(true)
	})

	it('works outside of the focus layer', () => {
		editor.select(ids.boxA)
		expect(editor.focusLayerId === groupAId).toBe(true)

		editor.setSelectedTool(TLEraserTool.id)

		// erase E
		editor.pointerDown(5, 25, ids.boxE)
		expect(editor.pageState.erasingIds.length).toBe(1)
		expect(editor.pageState.erasingIds[0]).toBe(ids.boxE)

		// move to group B
		editor.pointerMove(65, 5)

		expect(editor.erasingIdsSet.size).toBe(2)
	})
})

describe('bindings', () => {
	let groupAId: TLShapeId
	let groupBId: TLShapeId
	beforeEach(() => {
		//  group C
		// ┌─────────────────────────────────────────────────────────┐
		// │ group A                         group B                 │
		// │ ┌────────────────────────┐     ┌──────────────────────┐ │
		// │ │  0             20      │     │ 40            60     │ │
		// │ │  ┌───┐          ┌───┐  │     │ ┌───┐          ┌───┐ │ │
		// │ │  │ A │          │ B │  │     │ │ C │          │ D │ │ │
		// │ │  └───┘          └───┘  │     │ └───┘          └───┘ │ │
		// │ └────────────────────────┘     └──────────────────────┘ │
		// └─────────────────────────────────────────────────────────┘
		//
		//  20  ┌───┐
		//      │ E │
		//      └───┘
		editor.createShapes([
			box(ids.boxA, 0, 0),
			box(ids.boxB, 20, 0),
			box(ids.boxC, 40, 0),
			box(ids.boxD, 60, 0),
			box(ids.boxE, 0, 20),
		])
		editor.select(ids.boxA, ids.boxB)
		editor.groupShapes()
		groupAId = onlySelectedId()
		editor.select(ids.boxC, ids.boxD)
		editor.groupShapes()
		groupBId = onlySelectedId()
		editor.select(groupAId, groupBId)
		editor.groupShapes()
		editor.selectNone()
	})

	it('can not be made from some sibling shape to a group shape', () => {
		editor.setSelectedTool(TLArrowTool.id)
		// go from E to group C (not hovering over a leaf box)
		editor.pointerDown(5, 25).pointerMove(35, 5).pointerUp()
		const arrow = onlySelectedShape() as TLArrowShape

		expect(arrow.props.start).toMatchObject({ boundShapeId: ids.boxE })
		expect(arrow.props.end).toMatchObject({ type: 'point' })
	})

	it('can not be made from a group shape to some sibling shape', () => {
		editor.setSelectedTool(TLArrowTool.id)
		// go from group C (not hovering over a leaf box) to E
		editor.pointerDown(35, 5).pointerMove(5, 25).pointerUp()

		const arrow = onlySelectedShape() as TLArrowShape

		expect(arrow.props.start).toMatchObject({ type: 'point' })
		expect(arrow.props.end).toMatchObject({ boundShapeId: ids.boxE })
	})
	it('can be made from a shape within a group to some shape outside of the group', () => {
		editor.setSelectedTool(TLArrowTool.id)
		// go from A to E
		editor.pointerDown(5, 5).pointerMove(5, 25).pointerUp()
		const arrow = onlySelectedShape() as TLArrowShape

		expect(arrow.parentId).toBe(editor.currentPageId)

		expect(arrow.props.start).toMatchObject({ boundShapeId: ids.boxA })
		expect(arrow.props.end).toMatchObject({ boundShapeId: ids.boxE })
	})

	it('can be made from a shape within a group to another shape within the group', () => {
		editor.setSelectedTool(TLArrowTool.id)
		// go from A to B
		editor.pointerDown(5, 5).pointerMove(25, 5).pointerUp()
		const arrow = onlySelectedShape() as TLArrowShape

		expect(arrow.parentId).toBe(groupAId)
		expect(arrow.props.start).toMatchObject({ boundShapeId: ids.boxA })
		expect(arrow.props.end).toMatchObject({ boundShapeId: ids.boxB })
	})

	it('can be made from a shape outside of a group to a shape within the group', () => {
		editor.setSelectedTool(TLArrowTool.id)
		// go from E to B
		editor.pointerDown(5, 25).pointerMove(25, 5).pointerUp()
		const arrow = onlySelectedShape() as TLArrowShape

		expect(arrow.parentId).toBe(editor.currentPageId)
		expect(arrow.props.start).toMatchObject({ boundShapeId: ids.boxE })
		expect(arrow.props.end).toMatchObject({ boundShapeId: ids.boxB })
	})
})

describe('grouping arrows', () => {
	// Fix for <https://linear.app/tldraw/issue/TLD-887/cant-duplicate-arrows-in-group>
	it('grouping 2 arrows should not change indexes', () => {
		const arrowAId = createCustomShapeId('arrowA')
		const arrowBId = createCustomShapeId('arrowB')

		editor.createShapes([
			arrow(arrowAId, { x: 0, y: 0 }, { x: 0, y: 10 }),
			arrow(arrowBId, { x: 10, y: 0 }, { x: 10, y: 10 }),
		])

		const arrowABefore = editor.getShapeById(arrowAId)!
		const arrowBBefore = editor.getShapeById(arrowBId)!

		expect(arrowABefore.parentId).toMatch(/^page:/)
		expect(arrowABefore.index).toBe('a1')
		expect(arrowBBefore.parentId).toMatch(/^page:/)
		expect(arrowBBefore.index).toBe('a2')

		editor.select(arrowAId, arrowBId)
		editor.groupShapes()

		const arrowAAfter = editor.getShapeById(arrowAId)!
		const arrowBAfter = editor.getShapeById(arrowBId)!

		expect(arrowAAfter.parentId).toMatch(/^shape:/)
		expect(arrowAAfter.index).toBe('a1')

		expect(arrowBAfter.parentId).toMatch(/^shape:/)
		expect(arrowBAfter.index).toBe('a2')
	})
})

describe('moving handles within a group', () => {
	let groupA: TLGroupShape
	beforeEach(() => {
		// group A
		// ┌──────────────────────────────┐
		// │      0   10         90   100 │
		// │      ┌───┐                   │
		// │      │ A │                   │
		// │  10  └───┘                   │
		// │                              │
		// │                              │
		// │                              │
		// │                              │
		// │  90                  ┌───┐   │
		// │                      │ B │   │
		// │ 100                  └───┘   │
		// └──────────────────────────────┘
		editor.createShapes([box(ids.boxA, 0, 0), box(ids.boxB, 90, 90)])
		editor.select(ids.boxA, ids.boxB)
		editor.groupShapes()
		groupA = onlySelectedShape() as TLGroupShape
		editor.selectNone()
	})
	it('resizes the group appropriately', () => {
		editor.select(ids.boxA)
		expect(editor.focusLayerId).toBe(groupA.id)

		editor.setSelectedTool('arrow')

		editor.pointerDown(50, 50).pointerMove(60, 60).pointerUp(60, 60)

		let arrow = onlySelectedShape() as TLArrowShape

		expect(arrow.parentId).toBe(groupA.id)

		expect(arrow.props.start.type).toBe('point')
		if (arrow.props.start.type === 'point') {
			expect(arrow.props.start.x).toBe(0)
			expect(arrow.props.start.y).toBe(0)
		}

		expect(arrow.props.end.type).toBe('point')
		if (arrow.props.end.type === 'point') {
			expect(arrow.props.end.x).toBe(10)
			expect(arrow.props.end.y).toBe(10)
		}

		editor.expectToBeIn('select.idle')

		expect(editor.getPageBoundsById(groupA.id)).toCloselyMatchObject({
			x: 0,
			y: 0,
			w: 100,
			h: 100,
		})

		editor.pointerDown(60, 60, {
			target: 'handle',
			shape: arrow,
			handle: editor
				.getShapeUtil(TLArrowUtil)
				.handles(arrow)
				.find((h) => h.id === 'end'),
		})

		editor.expectToBeIn('select.pointing_handle')
		editor.pointerMove(60, -10)
		editor.expectToBeIn('select.dragging_handle')
		editor.pointerMove(60, -10)

		arrow = editor.getShapeById(arrow.id)!

		expect(arrow.parentId).toBe(groupA.id)

		expect(arrow.props.start.type).toBe('point')
		if (arrow.props.start.type === 'point') {
			expect(arrow.props.start.x).toBe(0)
			expect(arrow.props.start.y).toBe(0)
		}

		expect(arrow.props.end.type).toBe('point')
		if (arrow.props.end.type === 'point') {
			expect(arrow.props.end.x).toBe(10)
			expect(arrow.props.end.y).toBe(-60)
		}

		expect(editor.getPageBoundsById(groupA.id)).toCloselyMatchObject({
			x: 0,
			y: -10,
			w: 100,
			h: 110,
		})

		editor.pointerMove(50, -10)
		for (let i = -10; i >= -30; i--) {
			editor.pointerMove(i, i)
		}

		editor.pointerUp()

		expect(editor.getPageBoundsById(groupA.id)).toCloselyMatchObject({
			x: -30,
			y: -30,
			w: 130,
			h: 130,
		})
	})
})

// ! Parked temporarily. This behavior has changed and may need to change back.

// describe('copy/pasting to/from groups', () => {
// 	let groupAId: TLShapeId
// 	let groupBId: TLShapeId
// 	let groupCId: TLShapeId
// 	beforeEach(() => {
// 		//  group C
// 		// ┌─────────────────────────────────────────────────────────┐
// 		// │ group A                         group B                 │
// 		// │ ┌────────────────────────┐     ┌──────────────────────┐ │
// 		// │ │  0             20      │     │ 40            60     │ │
// 		// │ │  ┌───┐          ┌───┐  │     │ ┌───┐          ┌───┐ │ │
// 		// │ │  │ A │          │ B │  │     │ │ C │          │ D │ │ │
// 		// │ │  └───┘          └───┘  │     │ └───┘          └───┘ │ │
// 		// │ └────────────────────────┘     └──────────────────────┘ │
// 		// └─────────────────────────────────────────────────────────┘
// 		//
// 		//  20  ┌───┐
// 		//      │ E │
// 		//      └───┘
// 		editor.createShapes([
// 			box(ids.boxA, 0, 0),
// 			box(ids.boxB, 20, 0),
// 			box(ids.boxC, 40, 0),
// 			box(ids.boxD, 60, 0),
// 			box(ids.boxE, 0, 20),
// 		])
// 		editor.select(ids.boxA, ids.boxB)
// 		editor.groupShapes()
// 		groupAId = onlySelectedId()
// 		editor.select(ids.boxC, ids.boxD)
// 		editor.groupShapes()
// 		groupBId = onlySelectedId()
// 		editor.select(groupAId, groupBId)
// 		editor.groupShapes()
// 		groupCId = onlySelectedId()
// 		editor.selectNone()
// 	})

// 	it('should allow copying and pasting within the same focus layer', () => {
// 		editor.select(groupAId)
// 		expect(editor.focusLayerId).toBe(groupCId)
// 		editor.copy()
// 		editor.paste()
// 		expect(editor.focusLayerId).toBe(groupCId)
// 		expect(onlySelectedId()).not.toBe(groupAId)
// 		expect(onlySelectedShape().type).toBe(TLGroupUtil.type)
// 		expect(
// 			editor.getSortedChildIds(onlySelectedShape().id).map((id) => editor.getShapeById(id)!.type)
// 		).toEqual(['geo', 'geo'])
// 	})

// 	it('should allow copying from within a group and pasting into a higher focus level', () => {
// 		editor.select(groupAId)
// 		expect(editor.focusLayerId).toBe(groupCId)
// 		editor.copy()
// 		editor.select(groupCId)
// 		expect(editor.focusLayerId).toBe(editor.currentPageId)
// 		editor.paste()
// 		expect(editor.focusLayerId).toBe(editor.currentPageId)
// 		expect(onlySelectedId()).not.toBe(groupAId)
// 		expect(onlySelectedShape().type).toBe(TLGroupUtil.type)
// 		expect(
// 			editor.getSortedChildIds(onlySelectedShape().id).map((id) => editor.getShapeById(id)!.type)
// 		).toEqual(['geo', 'geo'])
// 		expect(editor.getPageBoundsById(groupAId)).toCloselyMatchObject(
// 			editor.getPageBoundsById(onlySelectedId())
// 		)
// 	})
// 	it('should allow copying from a higher focus level and pasting into a group', () => {
// 		editor.select(groupCId)
// 		expect(editor.focusLayerId).toBe(editor.currentPageId)
// 		editor.copy()
// 		editor.select(ids.boxA)
// 		expect(editor.focusLayerId).toBe(groupAId)
// 		editor.paste()
// 		expect(editor.focusLayerId).toBe(groupAId)
// 		expect(onlySelectedId()).not.toBe(groupCId)
// 		expect(onlySelectedShape().parentId).toBe(groupAId)
// 		expect(onlySelectedShape().type).toBe(TLGroupUtil.type)
// 		expect(editor.getSortedChildIds(onlySelectedId()).map((id) => editor.getShapeById(id)!.type)).toEqual(
// 			[TLGroupUtil.type, TLGroupUtil.type]
// 		)
// 	})
// })

describe('snapping', () => {
	let groupAId: TLShapeId
	let groupBId: TLShapeId
	let groupCId: TLShapeId
	beforeEach(() => {
		//  group C
		// ┌─────────────────────────────────────────────────────────┐
		// │ group A                         group B                 │
		// │ ┌────────────────────────┐     ┌──────────────────────┐ │
		// │ │  0             20      │     │ 40            60     │ │
		// │ │  ┌───┐          ┌───┐  │     │ ┌───┐          ┌───┐ │ │
		// │ │  │ A │          │ B │  │     │ │ C │          │ D │ │ │
		// │ │  └───┘          └───┘  │     │ └───┘          └───┘ │ │
		// │ └────────────────────────┘     └──────────────────────┘ │
		// └─────────────────────────────────────────────────────────┘
		//
		//  20  ┌───┐
		//      │ E │
		//      └───┘
		editor.createShapes([
			box(ids.boxA, 0, 0),
			box(ids.boxB, 20, 0),
			box(ids.boxC, 40, 0),
			box(ids.boxD, 60, 0),
			box(ids.boxE, 0, 20),
		])
		editor.select(ids.boxA, ids.boxB)
		editor.groupShapes()
		groupAId = onlySelectedId()
		editor.select(ids.boxC, ids.boxD)
		editor.groupShapes()
		groupBId = onlySelectedId()
		editor.select(groupAId, groupBId)
		editor.groupShapes()
		groupCId = onlySelectedId()
		editor.selectNone()
	})

	it('does not happen between groups and their children', () => {
		editor.select(groupCId)
		editor.pointerDown(10, 5, groupCId)
		editor.pointerMove(80, 5, groupCId, { ctrlKey: true })
		expect(editor.snaps.lines.length).toBe(0)
	})

	it('does not happen between children and thier group', () => {
		editor.select(ids.boxD)
		editor.pointerDown(65, 5, ids.boxD)
		editor.pointerMove(80, 105, ids.boxD, { ctrlKey: true })
		expect(editor.snaps.lines.length).toBe(0)
	})
})

describe('When pressing enter with selected group', () => {
	it('Should select the children of the group when enter is pressed', () => {
		editor.createShapes([box(ids.boxA, 0, 0), box(ids.boxB, 20, 0), box(ids.boxC, 40, 0)])
		editor.select(ids.boxA, ids.boxB, ids.boxC)
		editor.groupShapes()
		editor.keyDown('Enter')
		editor.keyUp('Enter')
		expect(editor.selectedIds).toMatchObject([ids.boxA, ids.boxB, ids.boxC])
	})
	it('Should select the children of multiple groups when enter is pressed', () => {
		editor.createShapes([box(ids.boxA, 0, 0), box(ids.boxB, 20, 0)])
		editor.createShapes([box(ids.boxC, 40, 0), box(ids.boxD, 70, 0)])
		editor.select(ids.boxA, ids.boxB)
		editor.groupShapes()
		editor.select(ids.boxC, ids.boxD)
		editor.groupShapes()
		editor.selectAll() // both groups
		editor.keyDown('Enter')
		editor.keyUp('Enter')
		expect(editor.selectedIds).toMatchObject([ids.boxA, ids.boxB, ids.boxC, ids.boxD])
	})
})

describe('Group opacity', () => {
	it("should set the group's opacity to max even if the selected style panel opacity is lower", () => {
		editor.createShapes([box(ids.boxA, 0, 0), box(ids.boxB, 20, 0)])
		editor.select(ids.boxA, ids.boxB)
		editor.setProp('opacity', '0.5')
		editor.groupShapes()
		const group = editor.getShapeById(onlySelectedId())!
		assert(editor.isShapeOfType(group, TLGroupUtil))
		expect(group.props.opacity).toBe('1')
	})
})
