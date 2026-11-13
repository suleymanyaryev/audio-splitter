import { describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import App from '../App.vue'

async function chooseFile(wrapper: ReturnType<typeof mount>, file: File) {
  const input = wrapper.get<HTMLInputElement>('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: [file] })
  await input.trigger('change')
}

describe('App', () => {
  it('opens on the load page', () => {
    const wrapper = mount(App)

    expect(wrapper.text()).toContain('Choose file…')
    expect(wrapper.text()).not.toContain('Whole file')
  })

  it('shows the review page with the file chip once a file is chosen', async () => {
    const wrapper = mount(App)

    await chooseFile(wrapper, new File(['x'], 'evening-set-vol3.m4a'))

    expect(wrapper.findAll('h2').map((heading) => heading.text())).toContain('Whole file')
    expect(wrapper.text()).toContain('evening-set-vol3.m4a')
  })

  it('returns to the load page on "New file"', async () => {
    const wrapper = mount(App)
    await chooseFile(wrapper, new File(['x'], 'evening-set-vol3.m4a'))

    const newFile = wrapper.findAll('button').find((button) => button.text() === 'New file')
    await newFile?.trigger('click')

    expect(wrapper.text()).toContain('Choose file…')
    expect(wrapper.text()).not.toContain('evening-set-vol3.m4a')
  })
})
