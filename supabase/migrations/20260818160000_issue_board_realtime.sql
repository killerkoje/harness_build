-- Grants + RLS so the dashboard can use the anon key (browser Realtime/REST).
-- Realtime publication so postgres_changes reach supabase-js in the browser.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on table
  public.projects,
  public.plans,
  public.plan_snapshots,
  public.issues,
  public.wireframes,
  public.issue_subtasks,
  public.design_systems
to anon, authenticated, service_role;

grant usage, select on all sequences in schema public to anon, authenticated, service_role;

alter table public.projects replica identity full;
alter table public.plans replica identity full;
alter table public.plan_snapshots replica identity full;
alter table public.issues replica identity full;
alter table public.wireframes replica identity full;
alter table public.issue_subtasks replica identity full;
alter table public.design_systems replica identity full;

do $$
declare
  t text;
begin
  foreach t in array array[
    'projects',
    'plans',
    'plan_snapshots',
    'issues',
    'wireframes',
    'issue_subtasks',
    'design_systems'
  ]
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

drop policy if exists issue_board_all on public.projects;
drop policy if exists issue_board_all on public.plans;
drop policy if exists issue_board_all on public.plan_snapshots;
drop policy if exists issue_board_all on public.issues;
drop policy if exists issue_board_all on public.wireframes;
drop policy if exists issue_board_all on public.issue_subtasks;
drop policy if exists issue_board_all on public.design_systems;

create policy issue_board_all on public.projects for all to anon, authenticated using (true) with check (true);
create policy issue_board_all on public.plans for all to anon, authenticated using (true) with check (true);
create policy issue_board_all on public.plan_snapshots for all to anon, authenticated using (true) with check (true);
create policy issue_board_all on public.issues for all to anon, authenticated using (true) with check (true);
create policy issue_board_all on public.wireframes for all to anon, authenticated using (true) with check (true);
create policy issue_board_all on public.issue_subtasks for all to anon, authenticated using (true) with check (true);
create policy issue_board_all on public.design_systems for all to anon, authenticated using (true) with check (true);
