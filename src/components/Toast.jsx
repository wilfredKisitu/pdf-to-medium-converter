import './Toast.css'

export default function Toast({ msg, visible }) {
  return (
    <div className={`toast${visible ? ' toast--show' : ''}`}>
      {msg}
    </div>
  )
}
