import { Editor, createShapesFromFiles } from '@tldraw/editor'
import { VecLike } from '@tldraw/primitives'

/**
 * When the clipboard has a file, create an image shape from the file and paste it into the scene
 *
 * @param editor - The editor instance.
 * @param urls - The file urls.
 * @param point - The point at which to paste the file.
 * @internal
 */
export async function pasteFiles(editor: Editor, urls: string[], point?: VecLike) {
	const p =
		point ?? (editor.inputs.shiftKey ? editor.inputs.currentPagePoint : editor.viewportPageCenter)

	const blobs = await Promise.all(urls.map(async (url) => await (await fetch(url)).blob()))

	const files = blobs.map(
		(blob) =>
			new File([blob], 'tldrawFile', {
				type: blob.type,
			})
	)

	editor.mark('paste')
	await createShapesFromFiles(editor, files, p, false)
	urls.forEach((url) => URL.revokeObjectURL(url))
}
