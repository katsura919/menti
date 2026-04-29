export type Presentation = {
  id: string
  title: string
  join_code: string
  is_active: boolean
  current_slide_index: number
  created_by: string
  created_at: string
  slides?: Slide[]
}

export type Slide = {
  id: string
  presentation_id: string
  order_index: number
  type: 'poll' | 'open_ended'
  question: string
  options: string[] | null
  created_at: string
}

export type Participant = {
  id: string
  presentation_id: string
  display_name: string | null
  session_id: string
  joined_at: string
}

export type Response = {
  id: string
  slide_id: string
  participant_id: string
  answer: string
  created_at: string
}
