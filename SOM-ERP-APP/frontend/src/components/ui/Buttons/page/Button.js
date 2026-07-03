// Central button library — import from here across the entire app:
//
//   import { Button, BackButton, IconButton } from '../../../components/Buttons'
//
// Common patterns:
//   <Button variant="primary" icon={Plus}>Add Entry</Button>
//   <Button variant="success" icon={Download}>Export CSV</Button>
//   <Button variant="secondary" icon={X}>Cancel</Button>
//   <Button variant="danger" icon={Trash2}>Delete</Button>
//   <Button variant="warning" icon={Upload}>Outward</Button>
//   <BackButton />                        — navigates back
//   <BackButton onClick={goHome} />       — custom handler
//   <IconButton icon={Pencil} tooltip="Edit" />
//   <IconButton icon={Trash2} variant="danger" tooltip="Delete" />

export { default as Button }     from '../components/Button.jsx'
export { default as BackButton } from '../components/BackButton.jsx'
export { default as IconButton } from '../components/IconButton.jsx'
