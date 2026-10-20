export interface IPageResponse<Data> {
  list: Data,
  pagination: {
    total: number,
    limit: number,
    page: number,
    skip: number,
    items: number
  }
}