import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { KeyValueEditor } from './KeyValueEditor'

describe('KeyValueEditor', () => {
  it('syncs visible rows when value changes after mount', () => {
    const onChange = vi.fn()
    const { rerender } = render(<KeyValueEditor value={{}} onChange={onChange} />)

    rerender(<KeyValueEditor value={{ Authorization: 'Bearer token' }} onChange={onChange} />)

    expect(screen.getByDisplayValue('Authorization')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Bearer token')).toBeInTheDocument()
  })

  it('emits the full current value after syncing rows', () => {
    const onChange = vi.fn()
    const { rerender } = render(<KeyValueEditor value={{}} onChange={onChange} />)
    rerender(<KeyValueEditor value={{ Authorization: 'Bearer token' }} onChange={onChange} />)

    fireEvent.change(screen.getByDisplayValue('Bearer token'), { target: { value: 'Bearer next' } })

    expect(onChange).toHaveBeenLastCalledWith({ Authorization: 'Bearer next' })
  })
})
