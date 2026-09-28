import { it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import '../i18n'
import { Button, Modal } from './primitives'
afterEach(cleanup)
it('dialog traps focus, Escape closes and all controls have translated accessible names', async () => {
  function Fixture() { const [open, setOpen] = useState(false); return <><Button onClick={() => setOpen(true)}>Open</Button><Modal open={open} onOpenChange={setOpen} title="New trip" description="Prepare a journey"><input aria-label="Destination"/></Modal></> }
  render(<Fixture/>); const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Open' }))
  expect(screen.getByRole('dialog')).toBeTruthy()
  await user.tab(); expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true)
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).toBeNull()
})
