import { afterEach, describe, expect, it, vi } from 'vitest'

import { registerCoreWorker } from '../register-core-worker.ts'

function browserWithWorkers(register: () => Promise<unknown>) {
  const registerStub = vi.fn(register)
  vi.stubGlobal('navigator', { serviceWorker: { register: registerStub } })
  return registerStub
}

describe('registerCoreWorker', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it("registers sw.js at the app's base URL in a production build", async () => {
    vi.stubEnv('PROD', true)
    const register = browserWithWorkers(() => Promise.resolve({}))

    await registerCoreWorker()

    expect(register).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}sw.js`)
  })

  it('registers nothing under the dev server', async () => {
    vi.stubEnv('PROD', false)
    const register = browserWithWorkers(() => Promise.resolve({}))

    await registerCoreWorker()

    expect(register).not.toHaveBeenCalled()
  })

  it('does nothing in a browser without service workers', async () => {
    vi.stubEnv('PROD', true)
    vi.stubGlobal('navigator', {})

    await expect(registerCoreWorker()).resolves.toBeUndefined()
  })

  it('says nothing when the browser refuses the registration', async () => {
    vi.stubEnv('PROD', true)
    browserWithWorkers(() => Promise.reject(new Error('refused')))

    await expect(registerCoreWorker()).resolves.toBeUndefined()
  })
})
