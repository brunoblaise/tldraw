import { TLDrawTool } from '../../app/statechart/TLDrawTool/TLDrawTool'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})
afterEach(() => {
	editor?.dispose()
})

describe(TLDrawTool, () => {
	return
})

describe('When in the idle state', () => {
	it('Returns to select on cancel', () => {
		editor.setSelectedTool('draw')
		editor.expectPathToBe('root.draw.idle')
		editor.cancel()
		editor.expectPathToBe('root.select.idle')
	})

	it('Enters the drawing state on pointer down', () => {
		editor.setSelectedTool('draw')
		editor.pointerDown(50, 50)
		editor.expectPathToBe('root.draw.drawing')
	})
})

describe('When in the drawing state', () => {
	it('Returns to idle on cancel', () => {
		editor.setSelectedTool('draw')
		editor.pointerDown(50, 50)
		editor.cancel()
		editor.expectPathToBe('root.draw.idle')
	})

	it('Returns to idle on complete', () => {
		editor.setSelectedTool('draw')
		editor.pointerDown(50, 50)
		editor.pointerUp(50, 50)
		editor.expectPathToBe('root.draw.idle')

		editor.pointerDown(50, 50)
		editor.pointerMove(55, 55)
		editor.pointerMove(60, 60)
		editor.pointerUp(60, 60)
		editor.expectPathToBe('root.draw.idle')
	})
})
