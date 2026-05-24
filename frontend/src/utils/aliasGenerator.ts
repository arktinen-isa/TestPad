/**
 * Generates a deterministic, funny Ukrainian anonymous nickname based on userId.
 */
export function getAnonymousAlias(userId: string): string {
  const adjectives = [
    'Спритний', 'Мудрий', 'Швидкий', 'Хоробрий', 'Веселий', 
    'Уважний', 'Космічний', 'Креативний', 'Крутий', 'Завзятий',
    'Кмітливий', 'Допитливий', 'Невловимий', 'Мирний', 'Доброзичливий'
  ]
  const nouns = [
    'Кіт', 'Орел', 'Лев', 'Дельфін', 'Сокіл', 
    'Бобер', 'Єнот', 'Лис', 'Ведмідь', 'Тигр',
    'Панда', 'Хамелеон', 'Їжак', 'Мураха', 'Коала'
  ]
  
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  hash = Math.abs(hash)

  const safeIdx1 = hash % adjectives.length
  const safeIdx2 = (hash >> 2) % nouns.length
  const adj = adjectives.find((_, i) => i === safeIdx1) ?? adjectives[0]
  const noun = nouns.find((_, i) => i === safeIdx2) ?? nouns[0]
  return `${adj} ${noun}`
}
