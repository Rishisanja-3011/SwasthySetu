from app.core.supabase import supabase


def test_supabase_client():
    """
    Verify that the Supabase client initializes correctly.
    """
    assert supabase is not None