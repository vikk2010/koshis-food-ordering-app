// Initial menu loaded on first run. Admin edits are persisted to localStorage.
export const seedDishes = [
  { id: 'd1', sectionId: 's-mains', tags: ['bestseller'], name: 'Paneer Butter Masala', category: 'veg', price: 240, description: 'Cottage cheese cubes simmered in a rich, creamy tomato-butter gravy.', image: '', available: true },
  { id: 'd2', sectionId: 's-biryani', tags: [], name: 'Veg Biryani', category: 'veg', price: 200, description: 'Fragrant basmati rice layered with seasonal vegetables and whole spices.', image: '', available: true },
  { id: 'd3', sectionId: 's-south', tags: [], name: 'Masala Dosa', category: 'veg', price: 120, description: 'Crispy rice crepe stuffed with spiced potato, served with chutney and sambar.', image: '', available: true },
  { id: 'd4', sectionId: 's-biryani', tags: ['bestseller', 'spicy'], name: 'Chicken Biryani', category: 'nonveg', price: 280, description: 'Hyderabadi-style dum biryani with tender marinated chicken.', image: '', available: true },
  { id: 'd5', sectionId: 's-mains', tags: ['chef'], name: 'Butter Chicken', category: 'nonveg', price: 300, description: 'Tandoori chicken in a velvety, mildly spiced tomato cream sauce.', image: '', available: true },
  { id: 'd6', sectionId: 's-mains', tags: [], name: 'Fish Curry', category: 'nonveg', price: 320, description: 'Coastal-style fish curry with coconut and tamarind.', image: '', available: true },
]
