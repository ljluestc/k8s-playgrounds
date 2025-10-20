import { EventEmitter } from 'node:events'

export interface TypeaheadConfig {
  minQueryLength: number
  maxResults: number
  debounceMs: number
  caseSensitive: boolean
  fuzzyMatch: boolean
  highlightMatches: boolean
}

export interface TypeaheadItem {
  id: string
  text: string
  value: any
  category?: string
  metadata?: Record<string, any>
  score?: number
  highlightedText?: string
}

export interface TypeaheadResult {
  items: TypeaheadItem[]
  total: number
  query: string
  executionTime: number
  suggestions: string[]
}

export interface TypeaheadStats {
  totalQueries: number
  averageResponseTime: number
  cacheHitRate: number
  totalItems: number
  categories: string[]
  popularQueries: Array<{ query: string; count: number }>
}

export class TypeaheadSystem extends EventEmitter {
  private items: Map<string, TypeaheadItem> = new Map()
  private categories: Set<string> = new Set()
  private queryCache: Map<string, TypeaheadResult> = new Map()
  private queryStats: Map<string, number> = new Map()
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map()
  private config: TypeaheadConfig
  private startTime: Date

  constructor(config: Partial<TypeaheadConfig> = {}) {
    super()
    this.config = {
      minQueryLength: 1,
      maxResults: 10,
      debounceMs: 300,
      caseSensitive: false,
      fuzzyMatch: true,
      highlightMatches: true,
      ...config,
    }
    this.startTime = new Date()
    this.initializeDefaultData()
  }

  private initializeDefaultData(): void {
    // Add some default items for testing
    const defaultItems = [
      { id: '1', text: 'Apple', value: 'apple', category: 'Fruit' },
      { id: '2', text: 'Banana', value: 'banana', category: 'Fruit' },
      { id: '3', text: 'Cherry', value: 'cherry', category: 'Fruit' },
      { id: '4', text: 'Date', value: 'date', category: 'Fruit' },
      { id: '5', text: 'Elderberry', value: 'elderberry', category: 'Fruit' },
      { id: '6', text: 'Apple Pie', value: 'apple-pie', category: 'Dessert' },
      { id: '7', text: 'Banana Bread', value: 'banana-bread', category: 'Dessert' },
      { id: '8', text: 'Cherry Tart', value: 'cherry-tart', category: 'Dessert' },
      { id: '9', text: 'Apple Juice', value: 'apple-juice', category: 'Beverage' },
      { id: '10', text: 'Banana Smoothie', value: 'banana-smoothie', category: 'Beverage' },
      { id: '11', text: 'Cherry Soda', value: 'cherry-soda', category: 'Beverage' },
      { id: '12', text: 'Apple Cider', value: 'apple-cider', category: 'Beverage' },
      { id: '13', text: 'Banana Split', value: 'banana-split', category: 'Dessert' },
      { id: '14', text: 'Cherry Cheesecake', value: 'cherry-cheesecake', category: 'Dessert' },
      { id: '15', text: 'Apple Cinnamon', value: 'apple-cinnamon', category: 'Spice' },
    ]

    defaultItems.forEach(item => this.addItem(item))
  }

  public addItem(item: Omit<TypeaheadItem, 'id'> & { id?: string }): TypeaheadItem {
    const id = item.id || this.generateId()
    const typeaheadItem: TypeaheadItem = {
      id,
      text: item.text,
      value: item.value,
      category: item.category,
      metadata: item.metadata || {},
      score: 0,
    }

    this.items.set(id, typeaheadItem)

    if (item.category)
      this.categories.add(item.category)

    this.emit('itemAdded', { item: typeaheadItem })
    return typeaheadItem
  }

  public removeItem(id: string): boolean {
    const item = this.items.get(id)
    if (!item)
      return false

    this.items.delete(id)
    this.emit('itemRemoved', { item })
    return true
  }

  public updateItem(id: string, updates: Partial<Omit<TypeaheadItem, 'id'>>): TypeaheadItem | null {
    const item = this.items.get(id)
    if (!item)
      return null

    const updatedItem = { ...item, ...updates }
    this.items.set(id, updatedItem)

    if (updates.category)
      this.categories.add(updates.category)

    this.emit('itemUpdated', { item: updatedItem })
    return updatedItem
  }

  public getItem(id: string): TypeaheadItem | null {
    return this.items.get(id) || null
  }

  public search(query: string, options: {
    category?: string
    limit?: number
    fuzzy?: boolean
    caseSensitive?: boolean
  } = {}): TypeaheadResult {
    const startTime = Date.now()

    if (query.length < this.config.minQueryLength) {
      return {
        items: [],
        total: 0,
        query,
        executionTime: Date.now() - startTime,
        suggestions: [],
      }
    }

    // Check cache first
    const cacheKey = this.getCacheKey(query, options)
    if (this.queryCache.has(cacheKey)) {
      this.emit('cacheHit', { query, cacheKey })
      return this.queryCache.get(cacheKey)!
    }

    // Update query stats
    this.queryStats.set(query, (this.queryStats.get(query) || 0) + 1)

    // Perform search
    const results = this.performSearch(query, options)

    // Generate suggestions
    const suggestions = this.generateSuggestions(query, results.items)

    const result: TypeaheadResult = {
      items: results.items,
      total: results.total,
      query,
      executionTime: Date.now() - startTime,
      suggestions,
    }

    // Cache result
    this.queryCache.set(cacheKey, result)

    this.emit('searchCompleted', { query, result })
    return result
  }

  public searchAsync(query: string, options: {
    category?: string
    limit?: number
    fuzzy?: boolean
    caseSensitive?: boolean
  } = {}): Promise<TypeaheadResult> {
    return new Promise((resolve) => {
      const debounceKey = 'global-search' // Use a single debounce key for all searches

      // Clear existing debounce timer
      if (this.debounceTimers.has(debounceKey))
        clearTimeout(this.debounceTimers.get(debounceKey)!)

      // Set new debounce timer
      const timer = setTimeout(() => {
        const result = this.search(query, options)
        this.debounceTimers.delete(debounceKey)
        resolve(result)
      }, this.config.debounceMs)

      this.debounceTimers.set(debounceKey, timer)
    })
  }

  public getSuggestions(query: string, limit: number = 5): string[] {
    if (query.length < this.config.minQueryLength)
      return []

    const results = this.search(query, { limit })
    return results.suggestions.slice(0, limit)
  }

  public getItemsByCategory(category: string): TypeaheadItem[] {
    return Array.from(this.items.values())
      .filter(item => item.category === category)
  }

  public getCategories(): string[] {
    return Array.from(this.categories)
  }

  public clearCache(): void {
    this.queryCache.clear()
    this.emit('cacheCleared')
  }

  public getStatistics(): TypeaheadStats {
    const totalQueries = Array.from(this.queryStats.values()).reduce((sum, count) => sum + count, 0)
    const cacheHits = this.queryCache.size
    const cacheHitRate = totalQueries > 0 ? (cacheHits / totalQueries) * 100 : 0

    const popularQueries = Array.from(this.queryStats.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }))

    return {
      totalQueries,
      averageResponseTime: 0, // Would need to track this separately
      cacheHitRate,
      totalItems: this.items.size,
      categories: this.getCategories(),
      popularQueries,
    }
  }

  public updateConfig(newConfig: Partial<TypeaheadConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.emit('configUpdated', { config: this.config })
  }

  public destroy(): void {
    // Clear all debounce timers
    this.debounceTimers.forEach(timer => clearTimeout(timer))
    this.debounceTimers.clear()

    // Clear cache
    this.queryCache.clear()

    // Clear data
    this.items.clear()
    this.categories.clear()
    this.queryStats.clear()

    this.emit('destroyed')
  }

  private performSearch(query: string, options: {
    category?: string
    limit?: number
    fuzzy?: boolean
    caseSensitive?: boolean
  }): { items: TypeaheadItem[]; total: number } {
    const limit = options.limit || this.config.maxResults
    const fuzzy = options.fuzzy !== undefined ? options.fuzzy : this.config.fuzzyMatch
    const caseSensitive = options.caseSensitive !== undefined ? options.caseSensitive : this.config.caseSensitive

    let items = Array.from(this.items.values())

    // Filter by category
    if (options.category)
      items = items.filter(item => item.category === options.category)

    // Filter and score items
    const scoredItems = items
      .map((item) => {
        const score = this.calculateScore(item.text, query, fuzzy, caseSensitive)
        return { ...item, score }
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    // Highlight matches if enabled
    if (this.config.highlightMatches) {
      scoredItems.forEach((item) => {
        item.highlightedText = this.highlightMatches(item.text, query, caseSensitive)
      })
    }

    return {
      items: scoredItems,
      total: scoredItems.length,
    }
  }

  private calculateScore(text: string, query: string, fuzzy: boolean, caseSensitive: boolean): number {
    const searchText = caseSensitive ? text : text.toLowerCase()
    const searchQuery = caseSensitive ? query : query.toLowerCase()

    if (searchText === searchQuery)
      return 100
    if (searchText.startsWith(searchQuery))
      return 90
    if (searchText.includes(searchQuery))
      return 70

    if (fuzzy) {
      const fuzzyScore = this.calculateFuzzyScore(searchText, searchQuery)
      return fuzzyScore > 0.5 ? Math.round(fuzzyScore * 60) : 0
    }

    return 0
  }

  private calculateFuzzyScore(text: string, query: string): number {
    if (query.length === 0)
      return 0
    if (text.length === 0)
      return 0

    const textLower = text.toLowerCase()
    const queryLower = query.toLowerCase()

    let score = 0
    let queryIndex = 0

    for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
      if (textLower[i] === queryLower[queryIndex]) {
        score++
        queryIndex++
      }
    }

    return queryIndex === queryLower.length ? score / queryLower.length : 0
  }

  private highlightMatches(text: string, query: string, caseSensitive: boolean): string {
    const searchText = caseSensitive ? text : text.toLowerCase()
    const searchQuery = caseSensitive ? query : query.toLowerCase()

    if (!searchText.includes(searchQuery))
      return text

    const regex = new RegExp(`(${this.escapeRegex(searchQuery)})`, caseSensitive ? 'g' : 'gi')
    return text.replace(regex, '<mark>$1</mark>')
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  private generateSuggestions(query: string, items: TypeaheadItem[]): string[] {
    const suggestions = new Set<string>()

    items.forEach((item) => {
      if (item.text.toLowerCase().includes(query.toLowerCase()))
        suggestions.add(item.text)
    })

    return Array.from(suggestions).slice(0, 5)
  }

  private getCacheKey(query: string, options: any): string {
    return `${query}-${JSON.stringify(options)}`
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9)
  }
}
