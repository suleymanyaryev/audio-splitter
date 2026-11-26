import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { nextTick } from 'vue'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { usePlayerStore } from '../../model/player.ts'
import PlayerFailure from '../PlayerFailure.vue'

enableAutoUnmount(afterEach)

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('PlayerFailure', () => {
  it('shows nothing while nothing failed', () => {
    const wrapper = mount(PlayerFailure)

    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })

  it("shows the player's failure as a status line, and takes it away with the failure", async () => {
    const wrapper = mount(PlayerFailure)

    usePlayerStore().failure = "Couldn't play this range: Invalid data found"
    await nextTick()
    expect(wrapper.get('[role="status"]').text()).toBe(
      "Couldn't play this range: Invalid data found",
    )

    usePlayerStore().failure = null
    await nextTick()
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })
})
