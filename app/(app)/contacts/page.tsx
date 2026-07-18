"use client";

import { useState, useEffect, useCallback } from "react";
import type { Contact, ContactList } from "@/types";
import { ContactsView } from "@/components/views/ContactsView";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [lists, setLists] = useState<ContactList[]>([]);

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch("/api/contacts");
      const data = await res.json();
      if (Array.isArray(data?.contacts)) setContacts(data.contacts);
      if (Array.isArray(data?.lists)) setLists(data.lists);
    } catch {}
  }, []);

  useEffect(() => { fetchAll(); }, []);

  return <ContactsView contacts={contacts} lists={lists} onRefresh={fetchAll} />;
}
