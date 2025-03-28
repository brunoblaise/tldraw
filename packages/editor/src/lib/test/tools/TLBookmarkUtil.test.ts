import { TLBookmarkShape } from '@tldraw/tlschema'
import { TLBookmarkUtil } from '../../app/shapeutils/TLBookmarkUtil/TLBookmarkUtil'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})
afterEach(() => {
	editor?.dispose()
})

describe(TLBookmarkUtil, () => {
	return
})

describe('The URL formatter', () => {
	it('Formats URLs as human-readable', () => {
		const ids = {
			a: editor.createShapeId(),
			b: editor.createShapeId(),
			c: editor.createShapeId(),
			d: editor.createShapeId(),
			e: editor.createShapeId(),
			f: editor.createShapeId(),
		}

		editor.createShapes([
			{
				id: ids.a,
				type: 'bookmark',
				props: {
					url: 'https://www.github.com',
				},
			},
			{
				id: ids.b,
				type: 'bookmark',
				props: {
					url: 'https://www.github.com/',
				},
			},
			{
				id: ids.c,
				type: 'bookmark',
				props: {
					url: 'https://www.github.com/TodePond',
				},
			},
			{
				id: ids.d,
				type: 'bookmark',
				props: {
					url: 'https://www.github.com/TodePond/',
				},
			},
			{
				id: ids.e,
				type: 'bookmark',
				props: {
					url: 'https://www.github.com//',
				},
			},
			{
				id: ids.f,
				type: 'bookmark',
				props: {
					url: 'https://www.github.com/TodePond/DreamBerd//',
				},
			},
		])

		const a = editor.getShapeById<TLBookmarkShape>(ids.a)!
		const b = editor.getShapeById<TLBookmarkShape>(ids.b)!
		const c = editor.getShapeById<TLBookmarkShape>(ids.c)!
		const d = editor.getShapeById<TLBookmarkShape>(ids.d)!
		const e = editor.getShapeById<TLBookmarkShape>(ids.e)!
		const f = editor.getShapeById<TLBookmarkShape>(ids.f)!

		const util = editor.getShapeUtil(TLBookmarkUtil)
		expect(util.getHumanReadableAddress(a)).toBe('www.github.com')
		expect(util.getHumanReadableAddress(b)).toBe('www.github.com')
		expect(util.getHumanReadableAddress(c)).toBe('www.github.com/TodePond')
		expect(util.getHumanReadableAddress(d)).toBe('www.github.com/TodePond')
		expect(util.getHumanReadableAddress(e)).toBe('www.github.com')
		expect(util.getHumanReadableAddress(f)).toBe('www.github.com/TodePond/DreamBerd')
	})

	it("Doesn't resize bookmarks", () => {
		const ids = {
			bookmark: editor.createShapeId(),
			boxA: editor.createShapeId(),
			boxB: editor.createShapeId(),
		}

		editor.createShapes([
			{
				id: ids.bookmark,
				type: 'bookmark',
				props: {
					url: 'https://www.github.com/TodePond',
				},
			},
			{
				type: 'geo',
				id: ids.boxA,
				x: 0,
				y: 0,
				props: {
					w: 10,
					h: 10,
				},
			},
			{
				type: 'geo',
				id: ids.boxB,
				x: 20,
				y: 20,
				props: {
					w: 10,
					h: 10,
				},
			},
		])

		const oldBookmark = editor.getShapeById(ids.bookmark) as TLBookmarkShape
		expect(oldBookmark.props.w).toBe(300)
		expect(oldBookmark.props.h).toBe(320)

		editor.select(ids.bookmark, ids.boxA, ids.boxB)
		editor.pointerDown(20, 20, { target: 'selection', handle: 'bottom_right' })
		editor.pointerMove(30, 30)

		const newBookmark = editor.getShapeById(ids.bookmark) as TLBookmarkShape
		expect(newBookmark.props.w).toBe(300)
		expect(newBookmark.props.h).toBe(320)
	})
})
