import { createCustomShapeId } from '@tldraw/tlschema'
import { TestEditor } from '../TestEditor'

jest.useFakeTimers()

let editor: TestEditor

const ids = {
	boxA: createCustomShapeId('boxA'),
	boxB: createCustomShapeId('boxB'),
	boxC: createCustomShapeId('boxC'),
	boxD: createCustomShapeId('boxD'),
}

beforeEach(() => {
	editor = new TestEditor()
})

describe('distributeShapes command', () => {
	beforeEach(() => {
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
			{
				id: ids.boxD,
				type: 'geo',
				x: 700,
				y: 700,
			},
		])
	})

	describe('when less than three shapes are selected', () => {
		it('does nothing', () => {
			editor.setSelectedIds([ids.boxA, ids.boxB])
			const fn = jest.fn()
			editor.on('change-history', fn)
			editor.stackShapes('horizontal')
			jest.advanceTimersByTime(1000)
			expect(fn).not.toHaveBeenCalled()
		})
	})

	describe('when stacking horizontally', () => {
		it('stacks the shapes based on a given value', () => {
			editor.setSelectedIds([ids.boxA, ids.boxB, ids.boxC, ids.boxD])
			editor.stackShapes('horizontal', editor.selectedIds, 10)
			jest.advanceTimersByTime(1000)
			// 200 distance gap between c and d
			editor.expectShapeToMatch({
				id: ids.boxA,
				x: 0,
				y: 0,
			})
			editor.expectShapeToMatch({
				id: ids.boxB,
				x: 110,
				y: 100,
			})
			editor.expectShapeToMatch({
				id: ids.boxC,
				x: 220,
				y: 400,
			})
			editor.expectShapeToMatch({
				id: ids.boxD,
				x: 330,
				y: 700,
			})
		})

		it('stacks the shapes based on the most common gap', () => {
			editor.setSelectedIds([ids.boxA, ids.boxB, ids.boxC, ids.boxD])
			editor.stackShapes('horizontal')
			jest.advanceTimersByTime(1000)
			// 200 distance gap between c and d
			editor.expectShapeToMatch({
				id: ids.boxA,
				x: 0,
				y: 0,
			})
			editor.expectShapeToMatch({
				id: ids.boxB,
				x: 300,
				y: 100,
			})
			editor.expectShapeToMatch({
				id: ids.boxC,
				x: 600,
				y: 400,
			})
			editor.expectShapeToMatch({
				id: ids.boxD,
				x: 900,
				y: 700,
			})
		})

		it('stacks the shapes based on the average', () => {
			editor.updateShapes([{ id: ids.boxD, type: 'geo', x: 540, y: 700 }])
			editor.setSelectedIds([ids.boxA, ids.boxB, ids.boxC, ids.boxD])
			editor.stackShapes('horizontal')
			jest.advanceTimersByTime(1000)
			editor.expectShapeToMatch({
				id: ids.boxA,
				x: 0,
				y: 0,
			})
			editor.expectShapeToMatch({
				id: ids.boxB,
				x: 180,
				y: 100,
			})
			editor.expectShapeToMatch({
				id: ids.boxC,
				x: 360,
				y: 400,
			})
			editor.expectShapeToMatch({
				id: ids.boxD,
				x: 540,
				y: 700,
			})
		})
	})

	describe('when stacking vertically', () => {
		it('stacks the shapes based on a given value', () => {
			editor.setSelectedIds([ids.boxA, ids.boxB, ids.boxC, ids.boxD])
			editor.stackShapes('vertical', editor.selectedIds, 10)
			jest.advanceTimersByTime(1000)
			// 200 distance gap between c and d
			editor.expectShapeToMatch({
				id: ids.boxA,
				x: 0,
				y: 0,
			})
			editor.expectShapeToMatch({
				id: ids.boxB,
				x: 100,
				y: 110,
			})
			editor.expectShapeToMatch({
				id: ids.boxC,
				x: 400,
				y: 220,
			})
			editor.expectShapeToMatch({
				id: ids.boxD,
				x: 700,
				y: 330,
			})
		})

		it('stacks the shapes based on the most common gap', () => {
			editor.setSelectedIds([ids.boxA, ids.boxB, ids.boxC, ids.boxD])
			editor.stackShapes('vertical')
			jest.advanceTimersByTime(1000)
			// 200 distance gap between c and d
			editor.expectShapeToMatch({
				id: ids.boxA,
				x: 0,
				y: 0,
			})
			editor.expectShapeToMatch({
				id: ids.boxB,
				x: 100,
				y: 300,
			})
			editor.expectShapeToMatch({
				id: ids.boxC,
				x: 400,
				y: 600,
			})
			editor.expectShapeToMatch({
				id: ids.boxD,
				x: 700,
				y: 900,
			})
		})

		it('stacks the shapes based on the average', () => {
			editor.updateShapes([{ id: ids.boxD, type: 'geo', x: 700, y: 540 }])
			editor.setSelectedIds([ids.boxA, ids.boxB, ids.boxC, ids.boxD])
			editor.stackShapes('vertical')
			jest.advanceTimersByTime(1000)
			editor.expectShapeToMatch({
				id: ids.boxA,
				x: 0,
				y: 0,
			})
			editor.expectShapeToMatch({
				id: ids.boxB,
				x: 100,
				y: 180,
			})
			editor.expectShapeToMatch({
				id: ids.boxC,
				x: 400,
				y: 360,
			})
			editor.expectShapeToMatch({
				id: ids.boxD,
				x: 700,
				y: 540,
			})
		})
	})
})
