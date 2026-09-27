import Icon from './Icon.jsx'

export default function DishImage({ dish, className = '' }) {
  if (dish.image) return <img className={`dish-img ${className}`} src={dish.image} alt={dish.name} />
  return (
    <div className={`dish-img placeholder ${className}`} aria-hidden="true">
      <Icon name="soup" strokeWidth={1.75} />
    </div>
  )
}
