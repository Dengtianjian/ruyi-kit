export interface IPageResponse<Data> {
  data: Data,
  pagination: {
    total: number,
    limit: number,
    page: number,
    skip: number,
    items: number
  }
}