import { afterEach, describe, it, expect, vi } from 'vitest'
import { defineComponent } from 'vue'

import { enableAutoUnmount, mount } from '@vue/test-utils'
import { useQuestionMarkKey } from '../use-question-mark-key.ts'

enableAutoUnmount(afterEach)

const renderNothing = () => null

function mountListener(onPress: () => void) {
  const Host = defineComponent({
    setup() {
      useQuestionMarkKey(onPress)
      return renderNothing
    },
  })
  return mount(Host, { attachTo: document.body })
}

function press(key: string) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  document.dispatchEvent(event)
  return event
}

describe('useQuestionMarkKey', () => {
  it('calls back on ?, and keeps the browser from acting on it', () => {
    const onPress = vi.fn()
    mountListener(onPress)

    const event = press('?')

    expect(onPress).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
  })

  it('ignores every other key', () => {
    const onPress = vi.fn()
    mountListener(onPress)

    press('/')
    press('h')

    expect(onPress).not.toHaveBeenCalled()
  })
})
