import { Box2d } from '@tldraw/primitives'
import { TLGeoShape } from '@tldraw/tlschema'
import { resizeBox } from '../app/shapeutils/shared/resizeBox'
import { TestEditor } from './TestEditor'

let editor: TestEditor
let shape: TLGeoShape

beforeEach(() => {
	editor = new TestEditor()
	const id = editor.createShapeId() as TLGeoShape['id']
	editor.createShapes([
		{
			id,
			type: 'geo',
			x: 100,
			y: 100,
			props: {
				w: 100,
				h: 100,
				geo: 'rectangle',
			},
		},
	])
	shape = editor.getShapeById<TLGeoShape>(id)!
})

describe('Resize box', () => {
	it('Resizes from the top left', () => {
		const results = resizeBox(shape, {
			newPoint: { x: -50, y: -50 },
			handle: 'top_left',
			mode: 'resize_bounds',
			scaleX: 1.5,
			scaleY: 1.5,
			initialBounds: new Box2d(0, 0, 100, 100),
			initialShape: shape,
		})
		expect(results).toMatchObject({
			x: -50,
			y: -50,
			props: {
				w: 150,
				h: 150,
			},
		})
	})

	it('Resizes from the top right', () => {
		const results = resizeBox(shape, {
			newPoint: { x: 0, y: -50 },
			handle: 'top_right',
			mode: 'resize_bounds',
			scaleX: 1.5,
			scaleY: 1.5,
			initialBounds: new Box2d(0, 0, 100, 100),
			initialShape: shape,
		})
		expect(results).toMatchObject({
			x: 0,
			y: -50,
			props: {
				w: 150,
				h: 150,
			},
		})
	})

	it('Resizes from the bottom right', () => {
		const results = resizeBox(shape, {
			newPoint: { x: 0, y: 0 },
			handle: 'bottom_right',
			mode: 'resize_bounds',
			scaleX: 1.5,
			scaleY: 1.5,
			initialBounds: new Box2d(0, 0, 100, 100),
			initialShape: shape,
		})
		expect(results).toMatchObject({
			x: 0,
			y: 0,
			props: {
				w: 150,
				h: 150,
			},
		})
	})

	it('Resizes from the bottom left', () => {
		const results = resizeBox(shape, {
			newPoint: { x: -50, y: 0 },
			handle: 'bottom_right',
			mode: 'resize_bounds',
			scaleX: 1.5,
			scaleY: 1.5,
			initialBounds: new Box2d(0, 0, 100, 100),
			initialShape: shape,
		})
		expect(results).toMatchObject({
			x: -50,
			y: 0,
			props: {
				w: 150,
				h: 150,
			},
		})
	})
})
