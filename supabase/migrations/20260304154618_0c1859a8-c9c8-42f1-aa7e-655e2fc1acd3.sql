-- Create table for anonymous messages
CREATE TABLE public.aais_messages (
  id BIGINT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('Suggestion', 'Concern', 'Feedback', 'Confession', 'Appreciation')),
  message TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT,
  file_data TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'solved', 'unsolved'))
);

-- Enable RLS
ALTER TABLE public.aais_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (anonymous submissions)
CREATE POLICY "Anyone can submit messages"
  ON public.aais_messages FOR INSERT
  WITH CHECK (true);

-- Anyone can read messages
CREATE POLICY "Anyone can read messages"
  ON public.aais_messages FOR SELECT
  USING (true);

-- Anyone can update message status
CREATE POLICY "Anyone can update messages"
  ON public.aais_messages FOR UPDATE
  USING (true);

-- Anyone can delete messages
CREATE POLICY "Anyone can delete messages"
  ON public.aais_messages FOR DELETE
  USING (true);