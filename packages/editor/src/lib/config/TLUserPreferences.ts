import { getDefaultTranslationLocale } from '@tldraw/tlschema'
import { defineMigrations, migrate } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
import { atom } from 'signia'
import { uniqueId } from '../utils/data'

const USER_DATA_KEY = 'TLDRAW_USER_DATA_v3'

/**
 * A user of tldraw
 *
 * @public
 */
export interface TLUserPreferences {
	id: string
	name: string
	locale: string
	color: string
	isDarkMode: boolean
	animationSpeed: number
}

interface UserDataSnapshot {
	version: number
	user: TLUserPreferences
}

interface UserChangeBroadcastMessage {
	type: typeof broadcastEventKey
	origin: string
	data: UserDataSnapshot
}

const userTypeValidator: T.Validator<TLUserPreferences> = T.object<TLUserPreferences>({
	id: T.string,
	name: T.string,
	locale: T.string,
	color: T.string,
	isDarkMode: T.boolean,
	animationSpeed: T.number,
})

const Versions = {
	AddAnimationSpeed: 1,
} as const

const userTypeMigrations = defineMigrations({
	currentVersion: 1,
	migrators: {
		[Versions.AddAnimationSpeed]: {
			up: (user) => {
				return {
					...user,
					animationSpeed: 1,
				}
			},
			down: ({ animationSpeed: _, ...user }) => {
				return user
			},
		},
	},
})

/** @internal */
export const USER_COLORS = [
	'#FF802B',
	'#EC5E41',
	'#F2555A',
	'#F04F88',
	'#E34BA9',
	'#BD54C6',
	'#9D5BD2',
	'#7B66DC',
	'#02B1CC',
	'#11B3A3',
	'#39B178',
	'#55B467',
] as const

function getRandomColor() {
	return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]
}

function getFreshUserPreferences(): TLUserPreferences {
	return {
		id: uniqueId(),
		locale: typeof window !== 'undefined' ? getDefaultTranslationLocale() : 'en',
		name: 'New User',
		color: getRandomColor(),
		// TODO: detect dark mode
		isDarkMode: false,
		animationSpeed: 1,
	}
}

function migrateUserPreferences(userData: unknown) {
	if (userData === null || typeof userData !== 'object') {
		return getFreshUserPreferences()
	}

	if (!('version' in userData) || !('user' in userData) || typeof userData.version !== 'number') {
		return getFreshUserPreferences()
	}

	const migrationResult = migrate<TLUserPreferences>({
		value: userData.user,
		fromVersion: userData.version,
		toVersion: userTypeMigrations.currentVersion ?? 0,
		migrations: userTypeMigrations,
	})

	if (migrationResult.type === 'error') {
		return getFreshUserPreferences()
	}

	try {
		userTypeValidator.validate(migrationResult.value)
	} catch (e) {
		return getFreshUserPreferences()
	}

	return migrationResult.value
}

function loadUserPreferences(): TLUserPreferences {
	const userData =
		typeof window === 'undefined'
			? null
			: ((JSON.parse(window?.localStorage?.getItem(USER_DATA_KEY) || 'null') ??
					null) as null | UserDataSnapshot)

	return migrateUserPreferences(userData)
}

const globalUserPreferences = atom<TLUserPreferences>('globalUserData', loadUserPreferences())

function storeUserPreferences() {
	if (typeof window !== 'undefined' && window.localStorage) {
		window.localStorage.setItem(
			USER_DATA_KEY,
			JSON.stringify({
				version: userTypeMigrations.currentVersion,
				user: globalUserPreferences.value,
			})
		)
	}
}

/** @public */
export function setUserPreferences(user: TLUserPreferences) {
	userTypeValidator.validate(user)
	globalUserPreferences.set(user)
	storeUserPreferences()
	broadcastUserPreferencesChange()
}

const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test'

const channel =
	typeof BroadcastChannel !== 'undefined' && !isTest
		? new BroadcastChannel('tldraw-user-sync')
		: null

channel?.addEventListener('message', (e) => {
	const data = e.data as undefined | UserChangeBroadcastMessage
	if (data?.type === broadcastEventKey && data?.origin !== broadcastOrigin) {
		globalUserPreferences.set(migrateUserPreferences(data.data))
	}
})

const broadcastOrigin = uniqueId()
const broadcastEventKey = 'tldraw-user-preferences-change' as const

function broadcastUserPreferencesChange() {
	channel?.postMessage({
		type: broadcastEventKey,
		origin: broadcastOrigin,
		data: {
			user: globalUserPreferences.value,
			version: userTypeMigrations.currentVersion,
		},
	} satisfies UserChangeBroadcastMessage)
}

/** @public */
export function getUserPreferences() {
	return globalUserPreferences.value
}
