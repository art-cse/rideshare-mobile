import { menaxhoUdhetimin } from "@/app/shofer/actions";
import ButoniVeprimit from "./ButoniVeprimit";
export type TripEdit = {id: string; nisja: string; destinacioni: string; ora: string; vendtakimi: string; vende: number; version: string};
export default function MenaxhoUdhetimin({ trip }: {trip?: TripEdit}) {
  const prefix = trip?.id ?? "new";
  return <details><summary>{trip ? "Ndrysho / hiq udhëtimin" : "Shto udhëtim"}</summary>
    <form action={menaxhoUdhetimin} aria-label={trip ? `Ndrysho ${trip.id}` : "Shto udhëtim"}>
      <input type="hidden" name="operation" value={trip ? "edit" : "create"} />
      <input type="hidden" name="id" value={trip?.id ?? ""} /><input type="hidden" name="version" value={trip?.version ?? ""} />
      {([['nisja','Nisja'],['destinacioni','Destinacioni'],['ora','Ora'],['vendtakimi','Vendtakimi']] as const).map(([field,label]) =>
        <div key={field}><label htmlFor={`${prefix}-${field}`}>{label}</label>
          <input id={`${prefix}-${field}`} name={field} type={field === 'ora' ? 'time' : 'text'} defaultValue={trip?.[field] ?? ''} required maxLength={field === 'vendtakimi' ? 200 : 120} /></div>)}
      <label htmlFor={`${prefix}-vende`}>Vende të lira</label><input id={`${prefix}-vende`} name="vende" type="number" min={0} max={8} defaultValue={trip?.vende ?? 1} required />
      <ButoniVeprimit>{trip ? "Ruaj ndryshimet" : "Shto udhëtimin"}</ButoniVeprimit>
    </form>
    {trip && <form action={menaxhoUdhetimin} aria-label={`Hiq ${trip.id}`}>
      <input type="hidden" name="operation" value="archive" /><input type="hidden" name="id" value={trip.id} />
      <input type="hidden" name="version" value={trip.version} />
      <label><input name="confirm" type="checkbox" required />Konfirmoj heqjen dhe refuzimin e kërkesave në pritje.</label>
      <p>Udhëtimi ruhet në historik. Udhëtimet me pasagjerë të pranuar nuk hiqen.</p>
      <ButoniVeprimit>Hiq udhëtimin</ButoniVeprimit>
    </form>}
  </details>;
}
