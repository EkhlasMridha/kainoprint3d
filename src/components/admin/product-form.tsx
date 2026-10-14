"use client";

import { saveProduct } from "@/server/actions/catalog";
import { Field, Input } from "../ui/field";
import { ActionForm, CheckF, FormSection, NumF, PrefixError, SelectF, TextareaF, TextF, usePrefixError } from "./form";
import { RowsEditor, type Row } from "./rows-editor";

export interface ProductFormValues {
  id?: string;
  name: string;
  slug: string;
  categoryId: string;
  shortDescription: string;
  description: string;
  material: string;
  dimensions: string;
  basePrice: number; // taka
  minUnitPrice: number; // taka
  leadTimeMinDays: number;
  leadTimeMaxDays: number;
  availability: string;
  maxQuantity: number;
  allowQuantityDiscount: boolean;
  featured: boolean;
  published: boolean;
  isSample: boolean;
  sortOrder: number;
  colors: string;
  sizeOptions: Row[];
  materialOptions: Row[];
  personalization: Row[];
  images: Row[];
}

function Rows(props: Parameters<typeof RowsEditor>[0]) {
  const error = usePrefixError(props.name);
  return <RowsEditor {...props} error={error} />;
}

export function ProductForm({ values, categories, costHint }: { values: ProductFormValues; categories: { id: string; name: string }[]; costHint?: React.ReactNode }) {
  return (
    <ActionForm action={saveProduct} submitLabel={values.id ? "Save product" : "Create product"}>
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      <FormSection title="Basics">
        <TextF name="name" label="Name" defaultValue={values.name} required maxLength={120} />
        <TextF name="slug" label="URL slug" defaultValue={values.slug} required maxLength={80} hint="/products/your-slug — lowercase and hyphens" pattern="[a-z0-9]+(-[a-z0-9]+)*" />
        <SelectF name="categoryId" label="Category" defaultValue={values.categoryId} options={categories.map((c) => ({ value: c.id, label: c.name }))} />
        <SelectF
          name="availability"
          label="Availability"
          defaultValue={values.availability}
          options={[
            { value: "made_to_order", label: "Made to order" },
            { value: "limited", label: "Limited availability" },
            { value: "unavailable", label: "Temporarily unavailable" },
          ]}
        />
        <TextF name="shortDescription" label="Short description" defaultValue={values.shortDescription} required maxLength={200} className="sm:col-span-2" />
        <TextareaF name="description" label="Description" defaultValue={values.description} rows={5} maxLength={4000} className="sm:col-span-2" />
        <TextF name="material" label="Material (display)" defaultValue={values.material} maxLength={60} />
        <TextF name="dimensions" label="Dimensions" defaultValue={values.dimensions} maxLength={120} placeholder="e.g. 60 × 20 × 4 mm" />
      </FormSection>

      <FormSection title="Pricing" description="Customers see the starting price and option prices. The minimum unit price is private.">
        <NumF name="basePrice" label="Starting price" unit="৳" min={0} defaultValue={values.basePrice} required />
        <NumF
          name="minUnitPrice"
          label="Minimum sustainable unit price (private)"
          unit="৳"
          min={0}
          defaultValue={values.minUnitPrice}
          required
          tip="Quantity discounts never go below this. Use the 'minimum sustainable' price from this product's cost calculation."
        />
        {costHint ? <div className="sm:col-span-2">{costHint}</div> : null}
        <CheckF name="allowQuantityDiscount" label="Allow quantity discounts" defaultChecked={values.allowQuantityDiscount} hint="Uses the tiers in Customer estimator settings" />
        <NumF name="maxQuantity" label="Max quantity per online request" min={1} step="1" defaultValue={values.maxQuantity} />
        <NumF name="leadTimeMinDays" label="Production time from" unit="days" min={0} step="1" defaultValue={values.leadTimeMinDays} />
        <NumF name="leadTimeMaxDays" label="Production time to" unit="days" min={0} step="1" defaultValue={values.leadTimeMaxDays} />
      </FormSection>

      <FormSection title="Options" columns={1}>
        <div>
          <p className="mb-2 text-sm font-medium">Sizes (variants)</p>
          <Rows
            name="sizeOptions"
            initial={values.sizeOptions}
            blank={{ key: "", label: "", dimensions: "", priceDelta: 0 }}
            addLabel="Add size"
            columns={[
              { key: "key", label: "Key", type: "text", placeholder: "large", width: "120px" },
              { key: "label", label: "Label", type: "text", placeholder: "Large" },
              { key: "dimensions", label: "Dimensions", type: "text", placeholder: "80 × 26 mm" },
              { key: "priceDelta", label: "Price change", type: "number", unit: "৳", width: "130px" },
            ]}
          />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Material choices</p>
          <Rows
            name="materialOptions"
            initial={values.materialOptions}
            blank={{ key: "", label: "", priceDelta: 0 }}
            addLabel="Add material choice"
            columns={[
              { key: "key", label: "Key", type: "text", placeholder: "petg", width: "120px" },
              { key: "label", label: "Label", type: "text", placeholder: "PETG (tougher)" },
              { key: "priceDelta", label: "Price change", type: "number", unit: "৳", width: "130px" },
            ]}
          />
        </div>
        <TextF name="colors" label="Colours" defaultValue={values.colors} hint="Separate with commas, e.g. Black, White, Red" />
        <div>
          <p className="mb-2 text-sm font-medium">Personalisation fields</p>
          <Rows
            name="personalization"
            initial={values.personalization}
            blank={{ key: "", label: "", type: "text", maxLength: 20, options: "", required: false, price: 0 }}
            addLabel="Add field"
            maxRows={10}
            columns={[
              { key: "key", label: "Key", type: "text", placeholder: "name", width: "100px" },
              { key: "label", label: "Label", type: "text", placeholder: "Name" },
              { key: "type", label: "Type", type: "select", options: [{ value: "text", label: "Text" }, { value: "select", label: "Choice" }], width: "100px" },
              { key: "maxLength", label: "Max chars", type: "number", width: "90px", step: "1" },
              { key: "options", label: "Choices (comma-separated)", type: "text" },
              { key: "required", label: "Req.", type: "checkbox", width: "50px" },
              { key: "price", label: "Price", type: "number", unit: "৳", width: "90px" },
            ]}
          />
        </div>
      </FormSection>

      <FormSection title="Images" columns={1} description="The first image is used on product cards. Uploads: PNG, JPG or WEBP up to 5 MB each.">
        <Rows
          name="images"
          initial={values.images}
          blank={{ src: "", alt: "" }}
          addLabel="Add image path"
          maxRows={12}
          columns={[
            { key: "src", label: "Image path", type: "text", placeholder: "/images/products/…" },
            { key: "alt", label: "Description (alt text)", type: "text" },
          ]}
        />
        <div className="flex flex-wrap gap-3">
          {values.images.map((img) =>
            typeof img.src === "string" && img.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={img.src} src={img.src} alt="" className="size-20 rounded-lg border border-line object-cover" />
            ) : null,
          )}
        </div>
        <Field label="Upload new images">
          {(p) => <Input {...p} type="file" name="newImages" multiple accept=".png,.jpg,.jpeg,.webp" className="file:mr-3 file:rounded-full file:border-0 file:bg-panel file:px-3 file:py-1" />}
        </Field>
        <PrefixError prefix="newImages" />
      </FormSection>

      <FormSection title="Visibility" columns={3}>
        <CheckF name="published" label="Published" defaultChecked={values.published} hint="Visible on the website" />
        <CheckF name="featured" label="Featured" defaultChecked={values.featured} hint="Shown on the home page" />
        <CheckF name="isSample" label="Sample content" defaultChecked={values.isSample} hint="Untick once you've replaced it with real content" />
        <NumF name="sortOrder" label="Sort order" min={0} step="1" defaultValue={values.sortOrder} />
      </FormSection>
    </ActionForm>
  );
}
