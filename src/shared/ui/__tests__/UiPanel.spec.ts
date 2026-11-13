import { describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import UiPanel from '../UiPanel.vue'

describe('UiPanel', () => {
  it('is a section named by its title', () => {
    const wrapper = mount(UiPanel, { props: { title: 'Whole file' }, attachTo: document.body })

    const section = wrapper.get('section')
    const heading = wrapper.get('h2')
    expect(heading.text()).toBe('Whole file')
    expect(section.attributes('aria-labelledby')).toBe(heading.attributes('id'))
    wrapper.unmount()
  })

  it('shows the actions beside the title and the content below', () => {
    const wrapper = mount(UiPanel, {
      props: { title: 'Tracks (8)' },
      slots: { actions: '<button>Export to folder…</button>', default: '<p>blocks</p>' },
    })

    expect(wrapper.get('button').text()).toBe('Export to folder…')
    expect(wrapper.get('p').text()).toBe('blocks')
  })
})
