import { TLGeoTool } from '../../app/statechart/TLGeoTool/TLGeoTool'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})
afterEach(() => {
	editor?.dispose()
})

describe(TLGeoTool, () => {
	it('Creates geo shapes on click-and-drag, supports undo and redo', () => {
		expect(editor.shapesArray.length).toBe(0)

		editor.setSelectedTool('geo')
		editor.pointerDown(50, 50)
		editor.pointerMove(100, 100)
		editor.pointerUp(100, 100)

		expect(editor.shapesArray.length).toBe(1)
		expect(editor.shapesArray[0]?.type).toBe('geo')
		expect(editor.selectedIds[0]).toBe(editor.shapesArray[0]?.id)

		editor.undo()

		expect(editor.shapesArray.length).toBe(0)

		editor.redo()

		expect(editor.shapesArray.length).toBe(1)
	})

	it('Creates geo shapes on click, supports undo and redo', () => {
		expect(editor.shapesArray.length).toBe(0)

		editor.setSelectedTool('geo')
		editor.pointerDown(50, 50)
		editor.pointerUp(50, 50)

		expect(editor.shapesArray.length).toBe(1)
		expect(editor.shapesArray[0]?.type).toBe('geo')
		expect(editor.selectedIds[0]).toBe(editor.shapesArray[0]?.id)

		editor.undo()

		expect(editor.shapesArray.length).toBe(0)

		editor.redo()

		expect(editor.shapesArray.length).toBe(1)
	})
})

describe('When selecting the tool', () => {
	it('selects the tool and enters the idle state', () => {
		editor.setSelectedTool('geo')
		editor.expectPathToBe('root.geo.idle')
	})
})

describe('When in the idle state', () => {
	it('Enters pointing state on pointer down', () => {
		editor.setSelectedTool('geo')
		editor.pointerDown(100, 100)
		editor.expectPathToBe('root.geo.pointing')
	})

	it('Switches back to select tool on cancel', () => {
		editor.setSelectedTool('geo')
		editor.cancel()
		editor.expectPathToBe('root.select.idle')
	})

	it('Does nothing on interrupt', () => {
		editor.setSelectedTool('geo')
		editor.interrupt()
		editor.expectPathToBe('root.geo.idle')
	})

	it('Enters edit shape state on "Enter" key up when we have one geo shape', () => {
		editor.setSelectedTool('geo')
		editor.pointerDown(50, 50)
		editor.pointerMove(100, 100)
		editor.pointerUp(100, 100)

		editor.keyUp('Enter')
		editor.expectPathToBe('root.select.editing_shape')
	})

	it('Does not enter edit shape state on "Enter" key up when multiple geo shapes are selected', () => {
		editor.setSelectedTool('geo')
		editor.pointerDown(50, 50)
		editor.pointerMove(100, 100)
		editor.pointerUp(100, 100)

		editor.setSelectedTool('geo')
		editor.pointerDown(150, 150)
		editor.pointerMove(200, 200)
		editor.pointerUp(200, 200)

		expect(editor.shapesArray.length).toBe(2)

		editor.selectAll()
		expect(editor.selectedShapes.length).toBe(2)

		editor.keyUp('Enter')
		editor.expectPathToBe('root.select.idle')
	})
})

describe('When in the pointing state', () => {
	it('Switches back to idle on cancel', () => {
		editor.setSelectedTool('geo')
		editor.pointerDown(50, 50)
		editor.expectPathToBe('root.geo.pointing')
		editor.cancel()
		editor.expectPathToBe('root.geo.idle')
	})

	it('Enters the select.resizing state on drag start', () => {
		editor.setSelectedTool('geo')
		editor.pointerDown(50, 50)
		editor.pointerMove(51, 51) // not far enough!
		editor.expectPathToBe('root.geo.pointing')
		editor.pointerMove(55, 55)
		editor.expectPathToBe('root.select.resizing')
	})

	it('Enters the select.resizing state on pointer move', () => {
		editor.setSelectedTool('geo')
		editor.pointerDown(50, 50)
		editor.cancel()
		editor.expectPathToBe('root.geo.idle')
	})

	it('Returns to the idle state on interrupt', () => {
		editor.setSelectedTool('geo')
		editor.pointerDown(50, 50)
		editor.interrupt()
		editor.expectPathToBe('root.geo.idle')
	})

	it('Creates a geo and returns to select tool on pointer up', () => {
		expect(editor.shapesArray.length).toBe(0)
		editor.setSelectedTool('geo')
		editor.pointerDown(50, 50)
		editor.pointerUp(50, 50)
		editor.expectPathToBe('root.select.idle')
		expect(editor.shapesArray.length).toBe(1)
	})

	it('Creates a geo and returns to geo.idle on pointer up if tool lock is enabled', () => {
		editor.setToolLocked(true)
		expect(editor.shapesArray.length).toBe(0)
		editor.setSelectedTool('geo')
		editor.pointerDown(50, 50)
		editor.pointerUp(50, 50)
		editor.expectPathToBe('root.geo.idle')
		expect(editor.shapesArray.length).toBe(1)
	})
})

describe('When in the resizing state while creating a geo shape', () => {
	it('Returns to geo on cancel', () => {
		editor.setSelectedTool('geo')
		editor.pointerDown(50, 50)
		editor.pointerMove(55, 55)
		editor.expectPathToBe('root.select.resizing')
		editor.cancel()
		editor.expectPathToBe('root.geo.idle')
	})

	it('Returns to select.idle on complete', () => {
		editor.setSelectedTool('geo')
		editor.pointerDown(50, 50)
		editor.pointerMove(100, 100)
		editor.pointerUp(100, 100)
		editor.expectPathToBe('root.select.idle')
	})

	it('Returns to geo.idle on complete if tool lock is enabled', () => {
		editor.setToolLocked(true)
		editor.setSelectedTool('geo')
		editor.pointerDown(50, 50)
		editor.pointerMove(100, 100)
		editor.pointerUp(100, 100)
		editor.expectPathToBe('root.geo.idle')
	})
})
