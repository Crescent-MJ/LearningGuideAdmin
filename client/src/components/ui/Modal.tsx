import { Modal as AntModal } from 'antd'
import type { ModalProps as AntModalProps } from 'antd'

/**
 * UI Modal 封装：透传 Ant Design props，同时暴露静态方法。
 */
export interface ModalProps extends AntModalProps {}

function Modal(props: ModalProps) {
  return <AntModal {...props} />
}

Modal.confirm = AntModal.confirm
Modal.info = AntModal.info
Modal.success = AntModal.success
Modal.error = AntModal.error
Modal.warning = AntModal.warning

export default Modal
