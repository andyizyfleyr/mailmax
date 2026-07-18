"use client";

import { useState, useEffect, useCallback } from "react";
import type { Campaign, ContactList, Contact } from "@/types";
import { CampaignsView } from "@/components/views/CampaignsView";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [lists, setLists] = useState<ContactList[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  const fetchAll = useCallback(async () => {
    try {
      const [campRes, contRes] = await Promise.all([
        fetch("/api/campaigns"),
        fetch("/api/contacts"),
      ]);
      const campData = await campRes.json();
      const contData = await contRes.json();
      if (Array.isArray(campData)) setCampaigns(campData);
      if (Array.isArray(contData?.contacts)) setContacts(contData.contacts);
      if (Array.isArray(contData?.lists)) setLists(contData.lists);
    } catch {}
  }, []);

  useEffect(() => { fetchAll(); }, []);

  return <CampaignsView campaigns={campaigns} lists={lists} contacts={contacts} onRefresh={fetchAll} />;
}
