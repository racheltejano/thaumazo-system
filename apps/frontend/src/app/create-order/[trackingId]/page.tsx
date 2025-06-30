import CreateOrderForm from './CreateOrderForm'

interface Props {
  params: { trackingId: string }
}

export default async function CreateOrderPage({ params }: Props) {
  const trackingId = params.trackingId
  return <CreateOrderForm trackingId={trackingId} />
}
