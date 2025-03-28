import { Editor, TLClipboardModel } from '@tldraw/editor'
import { VecLike } from '@tldraw/primitives'

/**
 * When the clipboard has tldraw content, paste it into the scene.
 *
 * @param editor - The editor instance.
 * @param clipboard - The clipboard model.
 * @param point - (optional) The point at which to paste the text.
 * @internal
 */
export function pasteTldrawContent(editor: Editor, clipboard: TLClipboardModel, point?: VecLike) {
	const p = point ?? (editor.inputs.shiftKey ? editor.inputs.currentPagePoint : undefined)

	editor.mark('paste')
	editor.putContent(clipboard, {
		point: p,
		select: true,
	})
}
