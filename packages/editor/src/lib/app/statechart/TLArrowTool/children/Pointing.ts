import { createShapeId, TLArrowShape } from '@tldraw/tlschema'
import { TLArrowUtil } from '../../../shapeutils/TLArrowUtil/TLArrowUtil'
import { TLEventHandlers } from '../../../types/event-types'
import { StateNode } from '../../StateNode'
import { TLArrowTool } from '../TLArrowTool'

export class Pointing extends StateNode {
	static override id = 'pointing'

	shape?: TLArrowShape

	preciseTimeout = -1
	didTimeout = false

	private startPreciseTimeout() {
		this.preciseTimeout = window.setTimeout(() => {
			if (!this.isActive) return
			if (!this.shape) return
			this.didTimeout = true
		}, 300)
	}

	private clearPreciseTimeout() {
		clearTimeout(this.preciseTimeout)
	}

	onEnter = () => {
		const {
			inputs: { currentPagePoint },
		} = this.editor

		this.didTimeout = false

		const shapeType = (this.parent as TLArrowTool).shapeType

		this.editor.mark('creating')

		const id = createShapeId()

		this.editor.createShapes([
			{
				id,
				type: shapeType,
				x: currentPagePoint.x,
				y: currentPagePoint.y,
			},
		])

		const util = this.editor.getShapeUtil(TLArrowUtil)
		const shape = this.editor.getShapeById<TLArrowShape>(id)
		if (!shape) return

		const handles = util.handles?.(shape)

		if (handles) {
			// start precise
			const point = this.editor.getPointInShapeSpace(shape, currentPagePoint)

			const change = util.onHandleChange?.(shape, {
				handle: { ...handles[0], x: point.x, y: point.y },
				isPrecise: true,
			})

			if (change) {
				const startTerminal = change.props?.start
				if (startTerminal?.type === 'binding') {
					this.editor.setHintingIds([startTerminal.boundShapeId])
				}
				this.editor.updateShapes([change], true)
			}
		}

		this.editor.select(id)

		this.shape = this.editor.getShapeById(id)

		this.startPreciseTimeout()
	}

	onExit = () => {
		this.clearPreciseTimeout()
	}

	onPointerMove: TLEventHandlers['onPointerMove'] = () => {
		if (!this.shape) return

		if (this.editor.inputs.isDragging) {
			const util = this.editor.getShapeUtil(this.shape)
			const handles = util.handles?.(this.shape)

			if (!handles) {
				this.editor.bailToMark('creating')
				throw Error('No handles found')
			}

			if (!this.didTimeout) {
				const util = this.editor.getShapeUtil(TLArrowUtil)
				const shape = this.editor.getShapeById<TLArrowShape>(this.shape.id)

				if (!shape) return

				const handles = util.handles(shape)

				if (handles) {
					const { x, y } = this.editor.getPointInShapeSpace(
						shape,
						this.editor.inputs.originPagePoint
					)
					const change = util.onHandleChange?.(shape, {
						handle: {
							...handles[0],
							x,
							y,
						},
						isPrecise: false,
					})

					if (change) {
						this.editor.updateShapes([change], true)
					}
				}
			}

			this.editor.setSelectedTool('select.dragging_handle', {
				shape: this.shape,
				handle: handles.find((h) => h.id === 'end')! /* end */,
				isCreating: true,
				onInteractionEnd: 'arrow',
			})
		}
	}

	override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
		this.cancel()
	}

	override onCancel: TLEventHandlers['onCancel'] = () => {
		this.cancel()
	}

	override onComplete: TLEventHandlers['onComplete'] = () => {
		this.cancel()
	}

	override onInterrupt: TLEventHandlers['onInterrupt'] = () => {
		this.cancel()
	}

	cancel() {
		this.editor.bailToMark('creating')
		this.editor.setHintingIds([])
		this.parent.transition('idle', {})
	}
}
