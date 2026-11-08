grant connect on database interniq to interniq_app;
grant usage on schema public to interniq_app;
grant select, insert, update, delete on all tables in schema public to interniq_app;
grant usage, select on all sequences in schema public to interniq_app;

alter default privileges in schema public
  grant select, insert, update, delete on tables to interniq_app;
alter default privileges in schema public
  grant usage, select on sequences to interniq_app;
