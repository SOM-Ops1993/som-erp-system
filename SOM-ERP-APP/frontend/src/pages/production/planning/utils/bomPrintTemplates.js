// Verbatim extraction of the BOM print/paperwork template functions from the
// legacy bom-issuance.html prototype (production-critical batch paperwork).
// DO NOT hand-edit template markup here — these are relocated unchanged so the
// printed output (Nano/Powder batch sheets, Master Requisition Sheet, etc.)
// stays byte-identical to what the shop floor already relies on.

// Mutable print-settings bag the legacy templates read via the bare 'state' identifier
// (e.g. state.showTotal, state.inclMasterSheet). Kept as a plain shared object so the
// extracted function bodies below did not need to be touched.
export const state = {
  showTotal: true,
  inclMasterSheet: true,
  skipCycleBOMs: false,
  sectionOnlyBMR: false,
  inclTechnical: false,
  inclFormulation: true,
  inclPacking: true,
  inclCOA: false,
  inclNano: false,
}

    const genId = () => Math.random().toString(36).slice(2, 10);
    const todayStr = () => new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
    const todayISO = () => new Date().toISOString().split('T')[0];
    const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    function fmtDate(iso) {
      if (!iso) return '';
      try { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase(); } catch { return iso; }
    }

    function incrCode(base, offset) {
      if (!base || offset === 0) return base || '';
      const m = base.match(/^(.*?)(\d+)([^0-9]*)$/);
      if (!m) return base;
      const [, pre, num, suf] = m;
      return `${pre}${String(parseInt(num, 10) + offset).padStart(num.length, '0')}${suf}`;
    }

    function normalizeToUnit(comps, batchQty) {
      const q = parseFloat(batchQty);
      if (!q || isNaN(q) || q === 1) return comps.map(c => ({ ...c }));
      return comps.map(c => ({
        ...c,
        // Section headers have no qty — don't divide
        qty: (c.isHeader || !c.qty) ? c.qty : String(parseFloat((parseFloat(c.qty) / q).toFixed(6)))
      }));
    }

    function scaleToQty(comps, targetQty) {
      const q = parseFloat(targetQty);
      if (!q || isNaN(q) || q === 1) return comps.map(c => ({ ...c }));
      return comps.map(c => ({
        ...c,
        // Section headers have no qty — don't multiply
        qty: (c.isHeader || !c.qty) ? c.qty : String(parseFloat((parseFloat(c.qty) * q).toFixed(4)))
      }));
    }

    var LOGO_SRC = "data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCACVARMDASIAAhEBAxEB/8QAHQABAAMAAwEBAQAAAAAAAAAAAAYHCAEEBQMJAv/EAEUQAAEDBAADBgMEBwQIBwAAAAECAwQABQYRBxIhCBMxQVFhcYGRFCIyoRZCUmKCscEVI5LRFzM0cqKywvAkN0RTdbPS/8QAGgEBAAIDAQAAAAAAAAAAAAAAAAMEAQIFBv/EADQRAAICAgAEBAUCBAcBAAAAAAABAgMEEQUSITETIkFhFFGBobEy8EJiccEVIyQzUpHR4f/aAAwDAQACEQMRAD8A2XoegpoegpSgGh6Cmh6ClKAaHoKaHoKUoBoegpoegpSgGh6Cmh6CorxZtr124e3eFHQVuLaCuUeJCVBRA99A1mTgmLnjXEC0y2GneU3BFtmgE8rrMgkNr17KSd+mk+9QyuUbORo5+Tn+BfGpx2n6mxdD0FND0Fedkt3hWCwzbzcHQ3GiMqdWSfQeA9yegHqaydwu4qS4fEp+8XdRS1cpK1OpB5ghK1b5BvyT018NedLbfD09GcvPhiyjGXr9vc2Foegpoegr5RZDMqM3IjuJcacSFIWk7CgfA19amLye+qGh6Cmh6ClKGRoegpoegpSgGh6Cmh6ClKAaHoKaHoKUoBoegpoegpSgGh6Cmh6ClKAaHoKaHoKUoBoegpoegpSgGh6Cmh6ClKAaHoKaHoKUoBoegpSlAKUpQClKUANcA1zUP4tR8lViMiVilzehXGKO8SEISoOgeKSFA/lWJPlWzSyfJBy1vRMKzzl3F27YFxVucCSwq42Vx3mUxzacaPq2T09Punp8OtevwP4p5DfLqmxZVGQ48sFKJTTRQpC+p5XUjppWjpY6bAB6kVBO1dj6YeZxry4HPskzRcUgdQeiVa+HKD/FVW2zajKL9Ti52Y548b6H2ZoHBc8xjNIne2O5NvOJSC7GX915v4pPX5jp712WMPx1m5u3Fq3IQ864h1QSSE86FcyVBPgCD1rDSV3jEr+1LhSnIkyOoOMPtK6HpsEHzSQQfcEeRrZeGZ41fuEv6ZltKHGIbrklryS60Dzj4Ep2PYipITjPv6EmDnxytq2Pmj1KV7V3EFy43f8AQm2Pahw1Bc5aFf617xCDryTvZ9z+7VCV958uRPnyJ0tzvJEhxTrq/wBpSjsn6mvvcrc7BjW551QP26MZCU66pT3i0Dfx5N/Oq85cz2eayr5ZNsrH+0aG7LvEpchQwy8v7cAJguKPj6o/rWi6/Oyz3GVaLrFukFzu5MV1LrSvRSTuv0LtkkTbbGmJGg+0lwD02N1Pjvo0ei4JlStrdcv4fwdilKVYO4KUpQClKUApSlAKUpQClKUApSlAKUpQClKUApSlAKUpQClKUAoaUNAZ24pZvm/D/igGbfPVMtUpIW3Dm6U2oq30C/xJO9gdddPA1b2LZrAyLBHMoisOpSy04ZEVfRxpxsHnbPv0/MV8+I2BWnNoKGp47t9sEId5ebp6EeY86Y1hzNgxOfaGXg6uW0oOrCdBa+6DfPrZ6kJTvr1Oz51Wgpxm4vscyqrIqun13B9jjApeE5KyMnxpqGp51PK8ptAS42o6JStPkrw8fjXb4jYhb80xt60zQEqI207rqhX+VYYsl3veNXMSbVPk26ayrlUppZSdjoQoeBHsauPEO0jkEFLbGR2mNdGx0U+wruXdepHVJPw5awpQa5WijRxXHsrdd8db7/I+L/DqfDbOI5lGcjsoUU2m/No52m+vRp0jwSSehPgSR4a1aXDjAb1YODeSYnci0uVN+1JYLa+ZKkrZCE/DZBrt49x14c3opZfuDttcX05JzPKn/ENp+pqx7ZPgXOGiXbZkeXGWPuOMuBaT8CK2rrintMtYmJjc3NXLfTX09z87VoW2tSHEKQtJIUlQ0QR4g1OeLEP7LDw1YBAdxyKr5lJUfzUatDtB8F5ztxk5XiUVUgPkuTYLY++FHxcbHnvxKfHfUb3oRfjhanv9HmA3fulAJs0eO4CnRQUtgHfzIFQTi4nAuw7KI2KS7a/JU1pgSbrdItrhIC5Mt5DDQJ0CpRAG/ma/Q63x0xIDEVH4WW0tj4AarMfZQwB6def01ubBTDhkogBYP947rRWPUJBI+J9U1qOrFEdLZ2uB40q6nZL+L8ClKVOdwUpSgFKUoBSlKAUpSgFKUoBSlKAUpSgFKUoBSlKAUpSgFKUoBSlKAprjRxIzPALuytq22uZanuqFrQtKvgSFaBHh4eY9dV6vCnjDas0mCzT4LlnvKkFbbC1czb6R5tr6b8+mvI63o1L8/wAVhZfYHLXMASfxNOcu+VXw8wfA1UGJ8GbxZ7+y26rUFp4Px5DUgExXUnYW2D94b1pSfBQPXqARVcrIT1raZx7XmU5O4+aD+xT3HzHXMc4pXZgoCY8x0zY5A6FLhJP0VzD5VAwNnRIA9T5VsntFcOnM2xZEu2NpVeraCtgaG3kfrN79/Ee496xs826y6pp1CkOIUUrSoEFJHkR5GtLIcrOBxPEePe/k+qPYVi19/s0XJq3PSIfm8ykqSPpX94hleQ4hckzbDcnojiT99ve23PZaD0Pz8PLVdTHr/ecfmCVZri/Dc3tXIr7q/ZST0UPYg1P4lzxLiM2mBfI8XGsmXpMe5x0csWSrfRLqP1Cf2h036eFarv0ZXpjtp1y1L9+pojgrxQgcQbWttxCId5jJBkxQeih4c6N+KT6eIPQ+RMjz7D7Vmlnbtl2DncoeS5/dq5SdeI37j/OsXQXci4Z5+068y5EuVudHeNn8LqD4j95Kh51uHFrzEyHH4V6gq5mJbKXU+2x1B9wenyqeElPyyPT8Pyvi4Om5eZd/c7NtgxLZAYgwWG48ZhAQ22gaSlI8ABVOcV+Pdsxqe9Z8cit3e4NEoeeUvTDSh5bHVZHmBoe+6lXaGyeRi3DCdKhOLamS1JhsOIOihS97UD5EJCiD66rH+DY5Ly7Lrfj0R1LT010pLihsISAVKV76SknXnW1k3F8qNOJ51lUo0U/qZN5nHziS+8Vt3OJGTv8AA1DRr/iBP516mO9ovNYMlBu7EC6x/wBZPddy58lJ6flVu2js/cPIkVDcyJNuLoH3nXpS0En4IKQK+V+7PGBTYq0W5E61vaPI41IU4AfLYXvY+YrTls+ZWWHxKPmVnX5b/aJ/w+y61ZtjTF7tK1d2slLjS/xsrHihQ9f5gg+dSGqx4A4LdsAg3y03J1uQ27MS7Gfb6JdRyAb5fFJ2NEe3nX07RGdOYVg6vsDoRdbiox4pB6tjX33AP3R+ZFTJ6jtnZhkShj+LctNLqdHivxusGGSXLVAaN3vCOi2W18rTJ9Fr69fYAn11VJXXtB8RJjylRZMC3tk/dQzFCtD4r3uq8xex3TK8jj2e2oL82Y4fvLUTrzUtR9ANkmtR4t2eMJg21tF8Eq7zCP7xwvqaRv8AdSgjQ+JNQqU7OxwoXZufJup8sV9Co7J2hc/hSEKnrt9zZB++h2OGyR7KRrX0NX3wo4t4/nifsiAbdd0o5lw3lA8wHiW1frD6EelQ7P8As64/Jtbr+Iuv2+e2OZDLrpcZc/dJVtST77PwrMyFXTH77zIU9AucB8jY+6tl1B0fmCKc04PzB5OZgTSufNFn6H1CON+WzsKwCTe7YmOqal5ptkPpKkHmUN7AI393fnX34OZejNsEhXk8iZQ2zLQk9EvJ/F8AdhQ9lCq87ZM4M4RaIAVpci495r1ShtYP5qTU0peXaO3lZGsWVsH6dCI472l70zJQm/2GFJYKgFLiKU2sDzICiQfhsVonDcmtGW2Fi82WSH4zvQg9FNqHilQ8iPSvz9ShSgpSUkhI2ogeA3rr8yKuzsh5ObbmcvG5Egpj3RnnYQeo79vr09CUc2/XlHtUNdj3pnE4bxS12qu17TNX18Z0qPBhvTJbqGY7CC444s6CUgbJPtqvtVKdrbK1WjCmMeivLRKu7hDnL0/uEaKxv3JSPcbqeT0tnocm9UVSsfoQi6dpS+IySQu22iA7Zg4Qy26FpeWgfrFW9Anx1rp4dfGr54ZZrbM8xlu825K2lBRbkMLP3mXABtJ9R1BB8wflWC+VXJz8p5Sdb103V+djGe43k1+tpcV3b0Rt4J305kL1v6L/AJVXrsblpnnuG8SunkKFj2pGod0rgeNc1aPUClKUApSlAKUpQClKUB17jNiW6G7MnSG47DSSpa1nQAqk8r7R9hhTVw8es0u7qSeUOuK7lCj7DRUfmBVz3i1W67xfs1yhtSmt7CXE70fUeh96priPwFt9zWubYDyOnqWVr0fgFHx/i+tV7p2R6xW19zm8QllqO8df+nWsXaAualpVfsBuTEUq+9Ii8znKPXlUkb+tepnXDPEeK1tTlOMzmos95P8AtDaPuOkeTqOhCh4b8R57qu8b4N5Zbrs09DjXKM+hXR0S0tJT77QQfpWkcRt0y02VDd1lMyZmuZ99DYRzemz56HTZqOq12txlF69yph+LlRcMmLa91oxzk3CDObE8pLtqVJaB0HWDzJPv7V4rGB5U6rlFpfB9xv8AlWns14/YVj8xcKCJF7kIJC1RNd0kjy5ydH+HdffB+Kt7ylSHI/Di8IiLP3ZPftpQR67c5AfkTW3hR30ZRlw7EdnJC37b/BW1zwbI8r4RE3m3PfpBYG9w5S0EKlRupLJ2NkpA2D8PU1KOyBkC5mLTbE+vaoTvO1s/qK8R8jr61enRaOo6EdRWfuGFs/Q3tF37H2mQzDmAuxkgaT3a0lwBPsCCn+Gk48jjIvyxvhb6rE978r/sTntJY1NybhhKZt7anZUJ5ExDSU7U4EAhSQPXlUSPXWqx7jN6uGOX+Je7W73MyI5ztkjY8CCCPQgkEehr9DKq7iDwOw/K5TlwZQ7Z57hKluxAAhxR81IPTe+uxonzreytye0bcS4dZfNW1PzIimKdpSxyGm2sks8uC9oBb0XTrRPro6UB7datLE+ImGZS53Nkv8WQ/wD+woltz/CoAn5Vn3IuzZk8RLjtlu8C5pHVLbgLDivbrtP1IqoL9Z71jF5MG7Q5Funs6WEq+6oeikkeI6eIPlWvPOP6ip/iGbi68eG1+/U/QvxFZM7YdzVI4iW+2hfM3Dt6Va/ZW4tW/wAkoqzuzFxDn5bZJdmvT5fuVsCSl9X4nmVbAKj5qBGifPp57qou1nEcj8W1PL/DJt7LiPgCtP8ANNbTlzQ2ixxPIV2Cpw7Nok/YxtDD12v17cbCnozTUdpR/VCyVK/5E1pus5diuSnusmh9OfmjuD4acFaNran9Bb4QksSOvf8AIrHXats8e18VXZUcEC4xG5Lg8gvqg6+PID8Sa2LWTO2I6hfEeA2kgqRa0c3ttxysXLykXG4p42380STsWXBR/SW1qV90FiQge550qP8Awpr49tN//wAbjEffg3JWR82xXHYriLM7Jpx/AG47Q9yS4T/T614vbGklfEO2RubaWrYlWvQqcX/+RWjf+UUJSa4Ut/vqeP2fsUYy+LmVtcTt1dpDbB/ZcK+ZB/xNpqvMZusrHcmgXdgFEmBJS6Eq6dUnqk/EbB+NXt2K4+5WUSiOnJGbH1dP+VVz2iMeVj3FW6JSnUeeoTmfg4TzD/GFflWmtQTKVtDhiV3x7pv89DaVqmx7lbI1xirC2JLKXm1DzSoAg/Q1jftM5Eb7xVmsNuhca2ITDb5fDaeq/nzKI/hFW/wCz1pjgZcZE3q5jTbiSnfVxASVtgfXkHwrOeG2qTmXECBbnQt1y5ztyFDx5SoqcV8hzGpLJbil8zocSyvHprhDvLr+/qTLiLin6O8FMLkuthMmdIekPnXm6hKkA/BCEj47rvdkeWI/FVUc/wDqbe82PiChX/Sas3tfQmk8MrWWm0oTFubaUBI0Ep7pwaHoPCqZ7NDvdcabH++H0fVlf+VatctiRWtrWPn1xX8ptYVzSlWj1gpSlAKUpQClKUApSlAKUFKAVmPtN8UZEu4P4TYJKmojB5Li+g6Lq/NoH9kefqenkd6XmIdciPNsOBp5SFBCyNhKtdDrzqr2eCOPqUtybOkyHVkqWtLaE7J6k9Qar3uztBbOdxGGRbX4dPr3ZlCxTH4ikps0BLtw2FfaXWw4pv8A3En7qf8AeIJ9OWrO4eY/kd+uqIz9wmzZ0k80h5x5Skso8+p8h+Z6VdsXg1izCx/fTlI/Y50gH6JFTaw2O1WKJ9ltcNuOg9VFI2pXuSep+dVHjXWvU+kTkY/BrnJeK9L2O3b4zcOExEa33bLaW07OzoDXWqoytoN9pTHpCBouW3lUfXRd/oat4VW98hLd482V8o2lEBS9/AOD+ahVrI6Ril81+Ts50fJBL/lH8kq4hZInEcSmZC5FVJbichW2lXKSkrSk6Pro7rrYTn+K5hFS7Zbsw48U8y4y1BDzf+8g9fn4e9d7OcfYynErlYJDhaRNYLYcA2UK8Uq156IB17ViPMsEyzDri6zdrVIQhtX3JbKFKZWPIhYGh8Do1JZNxfQhz8u/FmpRjuP9zenOjWytP1rJna0ySy3zL7bBtLrEly3MOIkvtEEFSlDTex48vKfhzfGqgcuM91sNOT5TiPJCnlEfTdSHCuHeW5bLbZtVnkBhR+9KfQW2Uj15j4/AbNRSsc1pI5OXxKzNh4MId/qWn2MYL6sjv9yCVBhuI2wVeRWpfNr6J/OpL2vsSeuFigZXDbUtduJZlJSN/wB0oghXwSr/AJvarP4V4Rb8CxVqzQ19+6pXeypBTovOkDateQ0AAPQVJpsWPNiOxJbKHmHkFDja0hSVpI0QQfEVLGHk5Tr04H+i8Cff+5h7glmwwTOmLpIDi7e+gx5iEePdqIPMB5lJAPw2POtsWS8Wu925q4WqfHmRXRtDrSwoH2+PtWXuLnAe9WaY9csRYcudrUSr7Ok7fY6/hA/XT6EdfUHxqnw7eLLJW0Fz7ZISdKSFLZWPiOhqKM3X0ZyMfKv4buqyO0b2y3J7Ji1ndul7ntRY6AeXmV95xWt8qR4qJ9BWGuImTP5fmdyyJ9Bb+1u7bbJ33baQEoT8eUDfvuunFiX/ACSalEePcrvJPQcqVvK+vXVX7wT4DyY05i/5uy2nuiHI9u2F7V4gu66dP2Rv39KSlKzojN11/E5KEI6iWD2bcSdxXhwwqYypqfclmW+lX4kAgBCT6aSAdepNUX2tXe84tKRv/V25hP5rP9a1+noNAaArMPatwm+yMxaya3W6TOhSIqGXSw2VqaWjf4gOuiCOvrv2qS2OoaRf4nQ4YSrgt60e72LWwLDkLuuqpbad/BG/612e2JjZl4zbclYZ5nLe8WX1AeDTmtE+wWEj+Ou12P4MqDhl4TMiPxnFXI6S82UEjukddHy3urZzCxRMmxe4WKbsMzWFNFQ8UnyUPcHR+VZjHdejfHo8bh6r+aMG2q+z7dY7vaIzykxrohpL6QfHu1hY/qPnVw9jzHvteWXHInQO7t7AYa2PFxzxPySnX8VVhlWA5Zjd3et0+yzVltRCXmWFLadHkpKgOo/P1rXXAbEF4dw6hQZLYbnySZUweYcWB90/BISn5VFXF83X0OTwvGsnkrnXSBHu1o3z8KFq/YnMq/mP61nrs/O9zxix1fX/AGhSfq2sf1rU/HvGrhlXDO4Wy1IDk1JQ+02TrvChQJSPcjevfVZe4RWO/QOK2PqlWa5Rg1PbDhcirSEjejskdKzYnzplniUJLNhNLp0/Jt2lKVZPSilKUApSlAKUpQClKUBwPOuarfI73lT/ABHONWOfGitmMHQXmgob1s+9F5JlWL5BboWULgzYNwX3Tb8dBSpC9gdR6dR/2KrPKim1p6T1spPOgpNNPSet+myyKVCcoyG5wOIths0Z1CYcxBLySgEk7Pn5eFSTKpb8DGrlOjKCXmIrjjZI2AoJJHSpFbF83sTxvjLm1/D3/J6VKhOL3S/3zhoLkxJbF2Wlwtr7scpUlZAGvDqBquxgGWC74k5cLmtDcqDzpmjWuUp6715dOv1rEb4Nr3WzSOVCTiu21tEu6V57tsbcyJi7kjnajLY1rxClJV/0/nUY4c3jIMjhXK7SHW2ojrikW5stgFIG/vKPn5D5Go9ll04hY67bm5N7tzpnSAwgojfhJ11PT3qOeRFQU2noiszIeGrHFtfvRbFcLQhaSlaUqB8QRuvBxSNk8cyDkVyhzEqCe57hrk5fHm3+X0qMycpyTJL3JtmGNxmosRXI/PkAkFX7o+R8jv2reV6ik2nt+nqSyyYxinJPb7L1JwLTagvnFshBW977hO/5V20gDoAAPaq2uN5zrD+SdfTDvFq5gHlsI5HGtnW/If8AflUmyy+qYwGVf7O+knuEusOFOxokeR9jWFkRae1rRrDJr1J600ttepJaVWVokcSbhj0e+RLra3UvMh5DC2NEjW9b9fnXtY9l7184fzr020mPNiNOpcTraQ4lHMCN+XUGkMiMujTXqK8yE3ppra2t+pMq68mDBlEGVDjvkeHeNBX8xUf4XXiffsPj3K4uJckOOOJUpKQkaCiB0FdGdkN0Z4twsdQ6gW92H3q0cg3zaX5+P6orbxo8ql6PX3NnkQdcZtdJa19SZR40aMjkjsNMp9EICR+VfWune57NstEq4Pq5W47SnFH4Cq74XZrfLrfzb7+W9So/fwyGwneiQda8RoH/AA1iy+EJqD7sWZNdVka33ZaFcaHpXkZrOk2zFLlcIigmRHjqW2SNgEDp0qE2OTxIumPMXqJdrWtLrZcQw4xonW+mwPall6hLl02zFuVGufJytvW+hZoSkHYAFc1GeHOTLyiwKmPMBiUw6WX0Dw5wAdj2OxUV4a55cLrlk2y3l5pXMVfZSEBPVKjtPTx6dfkax8TX5f5uxj4ypcn8/YtAgHxANK8/IrozZrHLuj/VEdor5d9VHyA+J0PnUP4OZRdsmi3J26utrUw6lLYQgJ0CD0962ldFWKv1ZJLIhG2NT7ssCuOVPjoVEuKeRysfsDZtqki4yn0MxwU83Xez0+HT5inC3Ipl/sb4uhSLlDkLZkAJCeoPTp5enyNPHh4vh+pj4mvxvB9e5LqUpUxYFKUoBSlKAUpSgFKUoCoshTd18bVJsbkVE37COUyASjWjvw869xrD8ivOQQrlltyhvMQVd4zGioISVbB2SfcA+fhXq/os/wD6SP0q+1N9z9m7nueU829a3upZVGGNuUnP579jm04alKbs3+ret9CqOKLU5/ibjjVtkoiy1MqDTqk8wQeY9deddrKLPnzWN3JyblUR+MmK4XW0xEgrTynY3rpsVI8hxd+55tZ7+iW223ASUqaKCSvZPgfLxr3MhgqudinW5DgbVJjraCyNhJUkjf51j4Zyc299e3X2Nfg3KVrltbfTT16Ea4K/+XVv3+07/wDYqoTxFs0u3Zl/ZlpfEeLlCkIeQnpyrCxzH4Hez67VVmYHZHccxeNaXn0PrZKyVpToHmUT4fOulleLv3nJ7Fd25TbSLa7zrQpJJX95J0PTwpZQ5URjrqtf/RbiyniwhrzLX/j+xILRAj2y2x7fFRyMsNhCB7CoDxq/2zGP/k0fzTVkVFs8xh/I37S4zKQwIMoPqCkE8wBHQfSpsityqcYr5FjMqcqHCC+X5JHLS4qE6llQS4WyEq9DrpVfcAXGhi0qIdJlMy1d+k/iBIGifpr5VYw8NVCL/gryrw7e8Zuzlmnvf64JTzNunxJI9d/Gl0Zc8bIrevT+pjIrmrIWwW9bWv6nscRpEWPg93XLKQ2qKtA5h4qUCEj47IqEsNPtdnpaXwQpUcrSD+yXdp/IivTRgV5u8ppeYZG5cozKgtMVpHIhR/e1/lv3qU5XZf7XxWVZIq24wdbDaDy/dQAQfAfCopQnY5Ta10aRDOq25zscdeVpL1ZA8QhZ/LwuAzbrlaYsF2MlLSihRdQgj4a3Uii42xi/Da6W5pwvOKivOPOka51lGideXQAfKvfxO2LsuNwLU46l1cZlLZWkaCteddi9xFXCzzIKFhCpDC2gojYBUkjf51tXjqMd+uiSnEUIJvblrXV9iquGNszKViEd2y5HGgwy45ysrjJWQeY76keZr+rZGvETjdbmr5cW58v7Eoh1tsIHLpzQ0Pff1qwOH9gdxrGWbS9IRIW2taitKdA8yifD511JmKvv8SIuVCW2GWIvclkoPMT9/rv+L8qhWLJQh32tepWjhSjVX32mtrf/AH7Hh8eLuI1gi2dDyWl3B4BxRP4W0kEn6lP51FswvmNQ5eNXTHZyH3rSpLDjSAoFTIHqR6cw/iqwblhxumeNX+4vtPwo7HdsxSjfX1VvofE/lXdyLELRc7HMgMQYcV15opbdSwAUK8j099Vm2i2yUpLXt9BdjX2ynNaXbX06/dn8cQHm5HDu6vtKCkOQVLSR5gp3VYRr/mNhwS0raVAatUkdy3IS2pTjIJPVXlvxPgfCrKYxuf8A6O14xJnNuPmMqOl/kOgOvLsb8hofKuYWItfoAjFrg4h8JZLfeJTrSt7CgPUHR+VZtpstlzLp0+5tfj3XT547i+X7/I+nDrHo+OY2iMzKEtT6u/cfHg4pQHUe2gKqK0wJH9gXLJLfoTbNd1Pg6/E305h/I/AGriwOz3Gw4+i1XGciYWVEMuJSRpHkk79Ovy1XTwbEl2GFdIsuQ1KbnvqcICNAJUNaO/GsTx3NQSWtJ/QW4jtVcVHSSf0fp9yN5hcms2n49jtvUVw5iUzppSfwtD9U/PY+Oq54FoSiVkyEgBKZxAA8gCqvb4d4M1ikufIVIElx9XIyrl0W2t7Cfj4b+ArsYHiz+Nv3Zx2W3I+3yC8nlQRydT0P1pXVY7I2TXXrv+wqoud0LrF1679umkQ3Nb3a5XFuAxdpTbVus6O8UVbILxAIHT35f8JpiF8tUbi7NbtUtD8C8I5tp2Al0AnXX3Cv8QqV4hg7NtfuUy8mNcpc6QXVLU1sJHU6G9+ZP5UzHCGrmu3SbKYtrlwpAeS4lnQUPHR1rzA/OtfBu/X6737/AC/BH8Nkf7ulvm3r1+Wt9uxM6Vwjehvx11rmukjtClKVkClKUApSlAKUpQClKUApSlAKUpQClKUApSlAKUpQClKUApSlAKUpQClKUApSlAKUpQClKUApSlAKUpQClKUB16UpUJKKUpQClKUApSlAKUpQClKUApSlAKUpQClKUApSlAKUpQClKUApSlAKUpQClKUApSlAKUpQClKUB//Z";
    function bomInnerHtml(bom) {

      var ROWS_PER_PAGE = 25;
      var allComps = bom.components || [];

      // Non-header items only (for totals)
      var comps = allComps.filter(function (c) { return c && c.component && !c.isHeader; });

      // ── Pagination: count only data rows toward the limit.
      //    When a page break happens mid-section, carry the section header
      //    to the top of the next page so context is never lost on continuation pages. ──
      var pages = [];
      var currentPage = [];
      var dataRowCount = 0;
      var currentSectionHeader = null;

      allComps.forEach(function (c) {
        if (!c || !c.component) return;
        if (c.isHeader) {
          currentSectionHeader = c;
          currentPage.push(c);
        } else {
          if (dataRowCount >= ROWS_PER_PAGE) {
            pages.push(currentPage);
            currentPage = [];
            dataRowCount = 0;
            // Carry section header to new page for context
            if (currentSectionHeader) currentPage.push(currentSectionHeader);
          }
          currentPage.push(c);
          dataRowCount++;
        }
      });
      if (currentPage.length > 0) pages.push(currentPage);
      if (pages.length === 0) pages.push([]);
      var totalPages = pages.length;

      // ── Section group helpers (using original allComps, not paginated pages) ──
      function buildSectionGroups(components) {
        var groups = [], cur = { header: null, items: [] };
        components.forEach(function (c) {
          if (!c || !c.component) return;
          if (c.isHeader) {
            if (cur.items.length || cur.header) groups.push(cur);
            cur = { header: c, items: [] };
          } else {
            cur.items.push(c);
          }
        });
        groups.push(cur);
        return groups;
      }

      function sectionSubTotal(items) {
        var map = {};
        items.forEach(function (c) {
          if (!c || !c.component) return;
          var uom = (c.uom || '-').trim(), qty = parseFloat(c.qty);
          if (!isNaN(qty)) map[uom] = (map[uom] || 0) + qty;
        });
        var totStr = Object.entries(map).map(function (e) {
          return parseFloat(e[1].toFixed(4)) + ' ' + e[0];
        }).join(' + ') || '&mdash;';
        return '<tr style="background:#eef4ea">'
          + '<td colspan="2" style="border:1px solid #000;padding:2px 5px;font-weight:700;font-size:8pt;text-align:right;color:#2d5e18;font-style:italic">&#8627; Section Total :</td>'
          + '<td colspan="3" style="border:1px solid #000;padding:2px 5px;font-weight:700;font-size:8pt;color:#2d5e18">' + totStr + '</td>'
          + '</tr>';
      }

      function calcTotals(components) {
        var map = {};
        components.forEach(function (c) {
          if (!c || !c.component || c.isHeader) return;
          var uom = (c.uom || '-').trim(), qty = parseFloat(c.qty);
          if (!isNaN(qty)) map[uom] = (map[uom] || 0) + qty;
        });
        return Object.entries(map).map(function (e) {
          return parseFloat(e[1].toFixed(4)) + ' ' + e[0];
        }).join(' + ');
      }

      function calcPageSub(pageRows) {
        var map = {};
        pageRows.forEach(function (r) {
          if (!r || !r.component || r.isHeader) return;
          var uom = (r.uom || '-').trim(), qty = parseFloat(r.qty);
          if (!isNaN(qty)) map[uom] = (map[uom] || 0) + qty;
        });
        return Object.entries(map).map(function (e) {
          return parseFloat(e[1].toFixed(4)) + ' ' + e[0];
        }).join(' + ');
      }

      var sectionGroups = buildSectionGroups(allComps);
      var hasSections = sectionGroups.some(function (g) { return g.header !== null; });
      var grandTotal = calcTotals(comps);
      var showTotal = (typeof state === 'undefined' || state.showTotal !== false);

      // ── Info grid (pre-filled header fields) ──
      function infoRow(l1, v1, l2, v2) {
        return '<tr>'
          + '<td style="padding:4px 5px;font-weight:700;font-size:10pt;border:1px solid #000;background:#eeeeee">' + l1 + '</td>'
          + '<td style="border:1px solid #000;padding:4px 4px;text-align:center;font-weight:700;width:2%">:</td>'
          + '<td style="border:1px solid #000;padding:4px 5px;font-weight:700;font-size:10.5pt;width:22%">' + esc(v1 || '') + '</td>'
          + '<td style="padding:4px 5px;font-weight:700;font-size:10pt;border:1px solid #000;background:#eeeeee;width:14%">' + l2 + '</td>'
          + '<td style="border:1px solid #000;padding:4px 4px;text-align:center;font-weight:700;width:2%">:</td>'
          + '<td style="border:1px solid #000;padding:4px 5px;font-weight:700;font-size:10.5pt">' + esc(v2 || '') + '</td>'
          + '</tr>';
      }
      var infoGrid = '<table style="width:100%;border-collapse:collapse">'
        + '<tr><td style="padding:4px 5px;font-weight:700;font-size:10pt;border:1px solid #000;background:#eeeeee;width:17%">NAME OF THE PRODUCT</td>'
        + '<td style="border:1px solid #000;padding:4px 4px;text-align:center;font-weight:700;width:2%">:</td>'
        + '<td style="border:1px solid #000;padding:4px 5px;font-weight:700;font-size:12pt" colspan="4">' + esc(bom.productName) + '</td></tr>'
        + infoRow('BOM NO', bom.bomNo, 'DI NO', bom.diNumber)
        + infoRow('BATCH NO', bom.batchNo, 'BATCH SIZE', (bom.batchSize || '') + ' ' + (bom.batchSizeUom || ''))
        + infoRow('TYPE OF BATCH', (bom.batchType || '').toUpperCase(), 'SHIFT', bom.shift)
        + infoRow('BATCH INCHARGE', bom.batchIncharge, 'REACTOR / VESSEL', bom.reactor)
        + infoRow('DATE OF REQUISITION', fmtDate(bom.dateRequisition) || todayStr(), 'DATE BATCH PLANNED', fmtDate(bom.datePlanned))
        + '</table>';
      // We use allComps (original order) to find true section ends, not paginated pages
      var secLastItemSet = [];
      if (hasSections && showTotal) {
        sectionGroups.forEach(function (g) {
          if (!g.header || !g.items.length) return;
          var lastItem = null;
          for (var gi = g.items.length - 1; gi >= 0; gi--) {
            if (g.items[gi] && g.items[gi].component) { lastItem = g.items[gi]; break; }
          }
          if (lastItem) secLastItemSet.push({ item: lastItem, group: g });
        });
      }

      var pageHtmlParts = pages.map(function (pageRows, pageIdx) {
        var isLast = pageIdx === totalPages - 1;
        var pageNum = pageIdx + 1;
        // Calculate startSno — count non-header items before this page
        var startSno = 1;
        for (var pi = 0; pi < pageIdx; pi++) {
          pages[pi].forEach(function (r) { if (r && r.component && !r.isHeader) startSno++; });
        }

        // ── Top section ──
        var topSection;
        if (pageIdx === 0) {
          topSection = '<div style="display:flex;align-items:center;justify-content:center;gap:12px;padding-bottom:4px;border-bottom:2.5px solid #000;margin-bottom:2px">'
            + '<img src="' + LOGO_SRC + '" style="height:62px;width:auto" alt="Logo"/>'
            + '<div style="text-align:center">'
            + '<div style="font-weight:700;font-size:19pt;letter-spacing:1px;font-family:Georgia,serif">SOM PHYTO PHARMA INDIA LTD.,</div>'
            + '<div style="font-size:9.5pt;margin-top:2px">Plot No. 154/A5-1 5VICE, IDA Bollaram - 502325. Phone No.: +91 9885438365</div>'
            + '</div></div>'
            + '<div style="text-align:center;font-weight:700;font-size:12pt;border:1px solid #000;padding:4px 0;letter-spacing:0.8px;background:#f0f0f0;margin-bottom:0">RAW MATERIAL REQUISITION</div>'
            + infoGrid;
        } else {
          topSection = '<div style="display:flex;align-items:center;gap:12px;padding-bottom:3px;border-bottom:2px solid #000;margin-bottom:2px">'
            + '<img src="' + LOGO_SRC + '" style="height:50px;width:auto" alt="Logo"/>'
            + '<div style="flex:1;text-align:center">'
            + '<div style="font-weight:700;font-size:14pt;font-family:Georgia,serif">SOM PHYTO PHARMA INDIA LTD. &#8212; CONTINUATION</div>'
            + '</div></div>'
            + '<table style="width:100%;border-collapse:collapse;margin-bottom:2px"><tr>'
            + '<td style="padding:3px 5px;font-weight:700;font-size:9.5pt;border:1px solid #000;background:#eeeeee;width:14%">PRODUCT</td>'
            + '<td style="border:1px solid #000;padding:3px 5px;font-weight:700;font-size:10pt;width:36%">' + esc(bom.productName) + '</td>'
            + '<td style="padding:3px 5px;font-weight:700;font-size:9.5pt;border:1px solid #000;background:#eeeeee;width:10%">BOM NO</td>'
            + '<td style="border:1px solid #000;padding:3px 5px;font-weight:700;width:18%">' + esc(bom.bomNo) + '</td>'
            + '<td style="padding:3px 5px;font-weight:700;font-size:9.5pt;border:1px solid #000;background:#eeeeee;width:8%">BATCH</td>'
            + '<td style="border:1px solid #000;padding:3px 5px;font-weight:700;font-size:10pt">' + esc(bom.batchNo) + '</td>'
            + '</tr></table>';
        }

        // ── Render component rows with section headers and sub-totals ──
        var curSno = startSno - 1;
        var rowsHtml = pageRows.map(function (row) {
          if (!row || !row.component) return '';
          var rowHtml = '';
          if (row.isHeader) {
            rowHtml = '<tr style="background:#d8e8f5">'
              + '<td colspan="5" style="border:1px solid #5585aa;padding:3px 8px;font-weight:700;font-size:10.5pt;font-style:italic;color:#1a3f5c">'
              + '&#9658;&nbsp;' + esc(row.component) + '</td></tr>';
          } else {
            curSno++;
            rowHtml = '<tr style="height:23px">'
              + '<td style="border:1px solid #000;padding:2px 4px;text-align:center;font-size:10.5pt">' + esc(row.sno || String(curSno)) + '</td>'
              + '<td style="border:1px solid #000;padding:2px 5px;font-size:10.5pt">' + esc(row.component) + '</td>'
              + '<td style="border:1px solid #000;padding:2px 4px;text-align:center;font-size:10.5pt">' + esc(row.qty || '') + '</td>'
              + '<td style="border:1px solid #000;padding:2px 4px;text-align:center;font-size:10.5pt">' + esc(row.uom || '') + '</td>'
              + '<td style="border:1px solid #000;padding:2px 5px;font-size:10.5pt">' + esc(row.remarks || '') + '</td></tr>';
            // Inject section sub-total after the last item in each named section
            if (showTotal) {
              secLastItemSet.forEach(function (entry) {
                if (entry.item === row) {
                  rowHtml += sectionSubTotal(entry.group.items);
                }
              });
            }
          }
          return rowHtml;
        }).join('');

        // ── Total / sub-total row ──
        var pageDataRows = pageRows.filter(function (r) { return r && r.component && !r.isHeader; });
        var totalRow = '';
        if (showTotal) {
          if (isLast) {
            var cnt = comps.length;
            totalRow = '<tr style="background:#f0f0f0">'
              + '<td colspan="2" style="border:1px solid #000;padding:4px 6px;font-weight:700;font-size:10.5pt;text-align:center">TOTAL QUANTITY (' + cnt + ' items)</td>'
              + '<td colspan="3" style="border:1px solid #000;padding:4px 6px;font-weight:700;font-size:10.5pt">' + (grandTotal || '&mdash;') + '</td></tr>';
          } else {
            var sub = calcPageSub(pageDataRows);
            totalRow = '<tr style="background:#f8f8f8">'
              + '<td colspan="2" style="border:1px solid #000;padding:3px 6px;font-weight:700;font-size:10pt;color:#444;text-align:center">Page ' + pageNum + ' Sub-total</td>'
              + '<td colspan="3" style="border:1px solid #000;padding:3px 6px;font-size:10pt;color:#444">' + (sub || '&mdash;') + ' <i style="font-size:9pt">(Contd.)</i></td></tr>';
          }
        }

        // ── Signatures (last page only) ──
        var sigsHtml = '';
        if (isLast) {
          sigsHtml = '<div style="border:1px solid #000;border-top:none;padding:4px 7px;font-size:10.5pt"><b>Remarks:</b> ' + esc(bom.remarks || '') + '</div>'
            + '<table style="width:100%;border-collapse:collapse;margin-top:5px">'
            + '<tr>'
            + '<td style="border:2px solid #000;padding:6px 10px;font-weight:700;font-size:11pt;text-align:center;width:48%;background:#f0f0f0">Stores In-charge (Issuance)</td>'
            + '<td style="width:4%;border:none">&nbsp;</td>'
            + '<td style="border:2px solid #000;padding:6px 10px;font-weight:700;font-size:11pt;text-align:center;width:48%;background:#f0f0f0">Plant Supervisor (Receiving)</td>'
            + '</tr><tr>'
            + '<td style="border-left:2px solid #000;border-right:2px solid #000;padding:30px 10px 6px;font-size:10.5pt">Signature :</td>'
            + '<td style="border:none"></td>'
            + '<td style="border-left:2px solid #000;border-right:2px solid #000;padding:30px 10px 6px;font-size:10.5pt">Signature :</td>'
            + '</tr><tr>'
            + '<td style="border:2px solid #000;border-top:1px solid #bbb;padding:8px 10px;font-size:10.5pt">Name &amp; Date Issued :</td>'
            + '<td style="border:none"></td>'
            + '<td style="border:2px solid #000;border-top:1px solid #bbb;padding:8px 10px;font-size:10.5pt">Name &amp; Date Received :</td>'
            + '</tr></table>';
        }

        // ── Footer ──
        var footer = '<div style="margin-top:3px;font-size:9.5pt;color:#444;display:flex;justify-content:space-between;border-top:0.5px solid #bbb;padding-top:3px">'
          + '<span>BOM: ' + esc(bom.bomNo) + ' &nbsp;|&nbsp; Batch: ' + esc(bom.batchNo) + '</span>'
          + '<span>Page ' + pageNum + ' of ' + totalPages + '</span>'
          + '<span>Cycle ' + bom.cycleNo + '/' + bom.totalCycles + '</span>'
          + '<span>SOM PHYTO PHARMA INDIA LTD.</span></div>';

        var tableHeader = '<table style="width:100%;border-collapse:collapse">'
          + '<thead><tr style="background:#e0e0e0">'
          + '<th style="border:1px solid #000;padding:5px 3px;font-weight:700;font-size:11pt;text-align:center;width:5%">S. No</th>'
          + '<th style="border:1px solid #000;padding:5px 3px;font-weight:700;font-size:11pt;text-align:center;width:44%">NAME OF THE COMPONENT</th>'
          + '<th style="border:1px solid #000;padding:5px 3px;font-weight:700;font-size:11pt;text-align:center;width:13%">QUANTITY</th>'
          + '<th style="border:1px solid #000;padding:5px 3px;font-weight:700;font-size:11pt;text-align:center;width:10%">UNITS</th>'
          + '<th style="border:1px solid #000;padding:5px 3px;font-weight:700;font-size:11pt;text-align:center;width:28%">REMARKS</th>'
          + '</tr></thead>';

        return '<div class="bom-page">'
          + '<div class="bom-scale">'
          + topSection
          + tableHeader
          + '<tbody>' + rowsHtml + totalRow + '</tbody></table>'
          + sigsHtml
          + footer
          + '</div></div>';
      });

      return pageHtmlParts.join('');
    }




    /* ═══════════════════════════════════════════════════════
       DUAL HALF-PAGE BOM — for products with ≤ 6 components
    ═══════════════════════════════════════════════════════ */
    function bomHalfPageBlock(bom, copyLabel) {
      var rows = Array.from({ length: 6 }, function (_, i) { return bom.components[i] || null; });
      var LOGO = "data:image/png;base64,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";
      var showTotal = (typeof state === 'undefined' || state.showTotal !== false);

      function calcTotals(components) {
        var map = {};
        components.forEach(function (c) {
          if (!c || !c.component || c.isHeader) return;
          var uom = (c.uom || '-').trim(), qty = parseFloat(c.qty);
          if (!isNaN(qty)) map[uom] = (map[uom] || 0) + qty;
        });
        return Object.entries(map).map(function (e) {
          return parseFloat(e[1].toFixed(4)) + ' ' + e[0];
        }).join(' + ');
      }

      /* Build section groups: [{header, items[]}] for section sub-totals */
      function buildSectionGroups(allComps) {
        var groups = [];
        var current = { header: null, items: [] };
        allComps.forEach(function (c) {
          if (!c || !c.component) { current.items.push(c); return; }
          if (c.isHeader) {
            if (current.items.length > 0 || current.header) groups.push(current);
            current = { header: c, items: [] };
          } else {
            current.items.push(c);
          }
        });
        groups.push(current);
        return groups;
      }

      /* Render section sub-total row */
      function sectionSubTotal(label, items) {
        var map = {};
        items.forEach(function (c) {
          if (!c || !c.component || c.isHeader) return;
          var uom = (c.uom || '-').trim(), qty = parseFloat(c.qty);
          if (!isNaN(qty)) map[uom] = (map[uom] || 0) + qty;
        });
        var totStr = Object.entries(map).map(function (e) {
          return parseFloat(e[1].toFixed(4)) + ' ' + e[0];
        }).join(' + ') || '&mdash;';
        return '<tr style="background:#eef4ea">'
          + '<td colspan="2" style="border:1px solid #000;padding:3px 6px;font-weight:700;font-size:8.5pt;text-align:right;color:#2d5e18;font-style:italic">Section Total:</td>'
          + '<td colspan="3" style="border:1px solid #000;padding:3px 6px;font-weight:700;font-size:8.5pt;color:#2d5e18">' + totStr + '</td>'
          + '</tr>';
      }

      var sectionGroups = buildSectionGroups(bom.components || []);
      var hasSections = sectionGroups.some(function (g) { return g.header !== null; });

      function ic(label, val) {
        return '<td style="padding:3px 4px;font-weight:700;font-size:9pt;border:1px solid #000;background:#eee">' + label + '</td>'
          + '<td style="border:1px solid #000;padding:3px 4px;text-align:center;font-weight:700">:</td>'
          + '<td style="border:1px solid #000;padding:3px 4px;font-weight:700;font-size:9.5pt">' + esc(val || '') + '</td>';
      }

      var totalRow = '';
      if (showTotal) {
        var cnt = bom.components.filter(function (c) { return c && c.component && !c.isHeader; }).length;
        var tot = calcTotals(bom.components);
        totalRow = '<tr style="background:#f0f0f0">'
          + '<td colspan="2" style="border:1px solid #000;padding:3px 5px;font-weight:700;font-size:9.5pt;text-align:center">TOTAL (' + cnt + ' items)</td>'
          + '<td colspan="3" style="border:1px solid #000;padding:3px 5px;font-weight:700;font-size:9.5pt">' + (tot || '&mdash;') + '</td></tr>';
      }

      return '<div style="flex:1;overflow:hidden;font-family:Georgia,serif;font-size:9pt;color:#000;background:#fff;padding:3mm 5mm 2mm;box-sizing:border-box">'
        // Header
        + '<div style="display:flex;align-items:center;gap:8px;border-bottom:2px solid #000;padding-bottom:2px;margin-bottom:2px">'
        + '<img src="' + LOGO + '" style="height:36px;width:auto"/>'
        + '<div style="flex:1;text-align:center">'
        + '<div style="font-weight:700;font-size:12.5pt;font-family:Georgia,serif;letter-spacing:0.5px">SOM PHYTO PHARMA INDIA LTD.,</div>'
        + '<div style="font-size:8pt">Plot No. 154/A5-1 5VICE, IDA Bollaram - 502325 | +91 9885438365</div>'
        + '</div>'
        + '<div style="font-size:8pt;font-weight:700;border:1.5px solid #000;padding:2px 5px;white-space:nowrap">' + copyLabel + '</div>'
        + '</div>'
        // Title
        + '<div style="text-align:center;font-weight:700;font-size:10pt;border:1px solid #000;padding:2px 0;background:#f0f0f0;letter-spacing:0.5px;margin-bottom:0">RAW MATERIAL REQUISITION</div>'
        // Info grid
        + '<table style="width:100%;border-collapse:collapse">'
        + '<tr><td style="padding:3px 4px;font-weight:700;font-size:9pt;border:1px solid #000;background:#eee;width:14%">PRODUCT</td>'
        + '<td style="border:1px solid #000;padding:3px 4px;text-align:center;font-weight:700">:</td>'
        + '<td style="border:1px solid #000;padding:3px 4px;font-weight:700;font-size:10.5pt" colspan="5">' + esc(bom.productName) + '</td></tr>'
        + '<tr>' + ic('BOM NO', bom.bomNo) + ic('DI NO', bom.diNumber) + '</tr>'
        + '<tr>' + ic('BATCH NO', bom.batchNo) + ic('BATCH SIZE', (bom.batchSize || '') + ' ' + (bom.batchSizeUom || '')) + '</tr>'
        + '<tr>' + ic('INCHARGE', bom.batchIncharge) + ic('SHIFT', bom.shift) + '</tr>'
        + '<tr>' + ic('REACTOR', bom.reactor) + ic('DATE PLAN', fmtDate(bom.datePlanned)) + '</tr>'
        + '</table>'
        // Component table
        + '<table style="width:100%;border-collapse:collapse">'
        + '<thead><tr style="background:#e0e0e0">'
        + '<th style="border:1px solid #000;padding:3px;font-size:9.5pt;text-align:center;width:6%">S.No</th>'
        + '<th style="border:1px solid #000;padding:3px;font-size:9.5pt;text-align:center;width:46%">NAME OF THE COMPONENT</th>'
        + '<th style="border:1px solid #000;padding:3px;font-size:9.5pt;text-align:center;width:13%">QUANTITY</th>'
        + '<th style="border:1px solid #000;padding:3px;font-size:9.5pt;text-align:center;width:10%">UNITS</th>'
        + '<th style="border:1px solid #000;padding:3px;font-size:9.5pt;text-align:center">REMARKS</th>'
        + '</tr></thead><tbody>'
        + rows.map(function (row, i) {
          return '<tr style="height:18px">'
            + '<td style="border:1px solid #000;padding:2px 3px;text-align:center;font-size:9.5pt">' + (row ? esc(row.sno || String(i + 1)) : '') + '</td>'
            + '<td style="border:1px solid #000;padding:2px 4px;font-size:9.5pt">' + (row ? esc(row.component) : '') + '</td>'
            + '<td style="border:1px solid #000;padding:2px 3px;text-align:center;font-size:9.5pt">' + (row ? esc(row.qty || '') : '') + '</td>'
            + '<td style="border:1px solid #000;padding:2px 3px;text-align:center;font-size:9.5pt">' + (row ? esc(row.uom || '') : '') + '</td>'
            + '<td style="border:1px solid #000;padding:2px 4px;font-size:9.5pt">' + (row ? esc(row.remarks || '') : '') + '</td></tr>';
        }).join('')
        + totalRow
        + '</tbody></table>'
        // Remarks
        + '<div style="border:1px solid #000;border-top:none;padding:2px 5px;font-size:9pt;min-height:14px"><b>Remarks:</b> ' + esc(bom.remarks || '') + '</div>'
        // Signatures
        + '<table style="width:100%;border-collapse:collapse;margin-top:3px">'
        + '<tr>'
        + '<td style="border:1.5px solid #000;padding:4px 7px;font-weight:700;font-size:9.5pt;text-align:center;width:48%;background:#f0f0f0">Stores In-charge (Issuance)</td>'
        + '<td style="width:4%;border:none"></td>'
        + '<td style="border:1.5px solid #000;padding:4px 7px;font-weight:700;font-size:9.5pt;text-align:center;width:48%;background:#f0f0f0">Plant Supervisor (Receiving)</td>'
        + '</tr><tr>'
        + '<td style="border-left:1.5px solid #000;border-right:1.5px solid #000;padding:18px 7px 4px;font-size:9.5pt">Signature :</td>'
        + '<td style="border:none"></td>'
        + '<td style="border-left:1.5px solid #000;border-right:1.5px solid #000;padding:18px 7px 4px;font-size:9.5pt">Signature :</td>'
        + '</tr><tr>'
        + '<td style="border:1.5px solid #000;border-top:1px solid #bbb;padding:7px 7px 5px;font-size:9.5pt">Name &amp; Date Issued :</td>'
        + '<td style="border:none"></td>'
        + '<td style="border:1.5px solid #000;border-top:1px solid #bbb;padding:7px 7px 5px;font-size:9.5pt">Name &amp; Date Received :</td>'
        + '</tr></table>'
        + '</div>';
    }

    function isDualCopy(bom) {
      return (bom.components || []).filter(function (c) { return c.component; }).length <= 6;
    }

    function bomDualHalfPage(bom) {
      var cut = '<div style="border-top:2px dashed #999;margin:2mm 5mm;text-align:center;position:relative">'
        + '<span style="background:#fff;padding:0 8px;font-size:8pt;color:#999;position:relative;top:-9px">&#9988;&nbsp;CUT HERE&nbsp;&#9988;</span></div>';

      return '<div class="bom-page">'
        + '<div class="bom-half-scale">'
        + bomHalfPageBlock(bom, 'COPY 1 \u2014 STORES')
        + cut
        + bomHalfPageBlock(bom, 'COPY 2 \u2014 PLANT')
        + '</div></div>';
    }


    function fullBomPage(bom, title) {
      var t = title || ('BOM_' + (bom.bomNo || '').replace(/\//g, '-'));
      var content = isDualCopy(bom) ? bomDualHalfPage(bom) : bomInnerHtml(bom);
      return buildPrintHtml(content, t);
    }

    var BS_LOGO = "data:image/png;base64,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";

    function bsPage(content) {
      return '<div class="bom-page"><div class="bom-scale" style="padding:5mm 6mm 4mm">' + content + '</div></div>';
    }

    /* ─── Shared batch header ─── */
    /* opts.blankOrderQty: true → leave Order Qty blank (packing sheet)  */
    /* opts.blankDiNo: true     → leave DI No blank (packing sheet)      */
    /* opts.hideCycle: true     → remove Temperature + Cycle row          */
    /* opts.equipment: string  → pre-fill equipment field                */
    function bsHeader(bom, sheetTitle, opts) {
      opts = opts || {};
      var orderQty = opts.blankOrderQty ? '' : (esc(bom.batchSize || '') + ' ' + esc(bom.batchSizeUom || ''));
      var diNo = opts.blankDiNo ? '' : esc(bom.diNumber || '');
      var equipment = (opts.equipment !== undefined) ? opts.equipment : '';
      var cycleRow = opts.hideCycle ? '' :
        '<tr>'
        + '<td style="' + BSL + '">CYCLE</td>'
        + '<td style="' + BSV + 'font-weight:700">Cycle ' + bom.cycleNo + ' of ' + bom.totalCycles + '</td>'
        + '<td style="' + BSL + '">SECTION</td>'
        + '<td style="' + BSV + '">' + esc(bom.section || '') + '</td>'
        + '</tr><tr>'
        + '<td style="' + BSL + '">DATE OF FORMULATION</td>'
        + '<td style="' + BSV + '">' + (fmtDate(bom.dateRequisition) || '') + '</td>'
        + '<td style="' + BSL + '">BATCH PLANNED DATE</td>'
        + '<td style="' + BSV + '">' + (fmtDate(bom.datePlanned) || '') + '</td>'
        + '</tr>';
      return '<div style="display:flex;align-items:center;justify-content:center;gap:10px;border-bottom:2.5px solid #000;padding-bottom:3px;margin-bottom:2px">'
        + '<img src="' + BS_LOGO + '" style="height:52px;width:auto"/>'
        + '<div style="text-align:center">'
        + '<div style="font-weight:700;font-size:17pt;letter-spacing:1px;font-family:Georgia,serif">SOM PHYTO PHARMA INDIA LTD</div>'
        + '<div style="font-size:8.5pt;margin-top:1px">MICROBIAL POWDER — BATCH MANUFACTURING &amp; PACKAGING RECORD &nbsp;&nbsp; <b>\u2605 NO FIELD TO BE LEFT BLANK</b></div>'
        + '</div></div>'
        + '<div style="text-align:center;font-weight:700;font-size:11pt;background:#e8e8e8;border:1.5px solid #000;padding:3px 0;letter-spacing:0.5px;margin-bottom:0">' + sheetTitle + '</div>'
        + '<table style="width:100%;border-collapse:collapse">'
        + '<tr>'
        + '<td style="' + BSL + 'width:25%">PRODUCT NAME</td>'
        + '<td style="' + BSV + 'font-weight:700;font-size:10pt;width:25%"><b>' + esc(bom.productName) + '</b></td>'
        + '<td style="' + BSL + 'width:25%">DI No.</td>'
        + '<td style="' + BSV + 'width:25%">' + diNo + '</td>'
        + '</tr><tr>'
        + '<td style="' + BSL + '">BATCH CODE</td>'
        + '<td style="' + BSV + 'font-weight:700"><b>' + esc(bom.batchNo) + '</b></td>'
        + '<td style="' + BSL + '">ORDER QTY</td>'
        + '<td style="' + BSV + '">' + orderQty + '</td>'
        + '</tr>'
        + cycleRow
        + '<tr>'
        + '<td style="' + BSL + '">EQUIPMENT ALLOTTED</td>'
        + '<td style="' + BSV + '">' + equipment + '</td>'
        + '<td style="' + BSL + '">TEMPERATURE</td>'
        + '<td style="' + BSV + '"></td>'
        + '</tr><tr>'
        + '<td style="' + BSL + '">EQUIP. CLEANING DATE &amp; TIME</td>'
        + '<td style="' + BSV + '"></td>'
        + '<td style="' + BSL + '">CFU COUNT ORDERED</td>'
        + '<td style="' + BSV + '"></td>'
        + '</tr><tr>'
        + '<td style="' + BSL + '">BATCH STARTED BY &amp; SIGN</td>'
        + '<td style="' + BSV + '"></td>'
        + '<td style="' + BSL + '">BATCH COMPLETED BY &amp; SIGN</td>'
        + '<td style="' + BSV + '"></td>'
        + '</tr>'
        + '</table>';
    }

    /* Equal 25% columns throughout all batch sheets */
    function bsRow4(l1, v1, l2, v2) {
      return '<tr>'
        + '<td style="' + BSL + 'width:25%">' + l1 + '</td>'
        + '<td style="' + BSV + 'width:25%">' + v1 + '</td>'
        + '<td style="' + BSL + 'width:25%">' + l2 + '</td>'
        + '<td style="' + BSV + 'width:25%">' + v2 + '</td>'
        + '</tr>';
    }
    function bsRow2(l1, v1) {
      return '<tr>'
        + '<td style="' + BSL + 'width:25%">' + l1 + '</td>'
        + '<td style="' + BSV + 'width:75%" colspan="3">' + v1 + '</td>'
        + '</tr>';
    }
    function bsSec(title, extra) {
      return '<tr style="background:#e0e0e0"><td colspan="4" style="border:1px solid #000;padding:3px 6px;font-weight:700;font-size:10pt;text-align:center;letter-spacing:0.3px">'
        + title + (extra ? ' &nbsp;<span style="font-weight:400;font-size:9pt">' + extra + '</span>' : '')
        + '</td></tr>';
    }
    function bsFooter(bom, label) {
      return '<div style="margin-top:3px;font-size:8pt;color:#555;display:flex;justify-content:space-between;border-top:0.5px solid #bbb;padding-top:2px">'
        + '<span>' + label + ' | BOM: ' + esc(bom.bomNo) + ' | Batch: ' + esc(bom.batchNo) + '</span>'
        + '<span>Cycle ' + bom.cycleNo + '/' + bom.totalCycles + '</span>'
        + '<span>SOM PHYTO PHARMA INDIA LTD \u2014 CONFIDENTIAL</span></div>';
    }
    var BSL = 'padding:3px 5px;font-weight:700;font-size:8.5pt;border:1px solid #000;background:#f0f0f0;';
    var BSV = 'padding:3px 5px;font-size:9pt;border:1px solid #000;';
    var BSTH = 'border:1px solid #000;padding:3px 4px;font-weight:700;font-size:8.5pt;text-align:center;background:#e8e8e8;';
    var BSTD = 'border:1px solid #000;padding:2px 4px;font-size:8.5pt;height:16px;';

    /* ════════════════════════════════════════════════════════
       TECHNICAL BATCH SHEET
    ════════════════════════════════════════════════════════ */
    function technicalSheet(bom) {
      var body = bsHeader(bom, 'TECHNICAL BATCH SHEET — MICROBIAL CULTURE PREPARATION');
      body += '<table style="width:100%;border-collapse:collapse">';
      body += bsSec('MICROBIAL CULTURE — TECHNICAL', '(YES / NO)');
      body += bsRow4('No. OF MICROBES RECEIVED', '', 'FORM OF MICROBIAL CULTURE', 'BIOMASS / SPRAY DRIED / BROTH');
      body += bsRow4('MICROBES RECEIVED FROM', '', 'MCR / SSF', '');
      body += bsRow4('FUNGAL CULTURE (YES/NO)', '', 'KOJI / HARVESTED', '');
      body += bsRow4('MICROBES RECEIVED ON', '', 'MICROBES RECEIVED TIME', '');
      body += bsRow4('TOTAL QTY RECEIVED (kg)', '', 'No. OF BAGS (IF FUNGI)', '');
      body += '</table>';

      // Culture detail table
      body += '<table style="width:100%;border-collapse:collapse;margin-top:1px">'
        + '<tr>'
        + '<th style="' + BSTH + ';width:28%">CULTURE NAME</th>'
        + '<th style="' + BSTH + ';width:20%">BATCH No.</th>'
        + '<th style="' + BSTH + ';width:20%">DOI / DOH</th>'
        + '<th style="' + BSTH + ';width:16%">CFU/g</th>'
        + '<th style="' + BSTH + ';width:16%">QTY (kg)</th>'
        + '</tr>';
      for (var i = 0; i < 6; i++) {
        body += '<tr><td style="' + BSTD + '"></td><td style="' + BSTD + '"></td><td style="' + BSTD + '"></td><td style="' + BSTD + '"></td><td style="' + BSTD + '"></td></tr>';
      }
      body += '</table>';

      // Technical Process
      body += '<table style="width:100%;border-collapse:collapse;margin-top:1px">';
      body += bsSec('TECHNICAL PROCESS');
      body += bsRow4('BIOMASS QTY (kg)', '', 'INITIAL MOISTURE %', '');
      body += bsRow4('START TIME', '', 'END TIME', '');
      body += bsRow4('QTY OF CO-FORMULANTS USED', '', 'No. OF WORKERS', '');
      body += bsRow4('TOTAL QTY. OF TECHNICAL (kg)', '', 'QTY OF TECHNICAL AFTER SIEVING (kg)', '');
      body += bsRow4('SIEVING', 'YES / NO', 'MESH SIZE USED', '');
      body += bsRow4('SIEVING START TIME', '', 'SIEVING END TIME', '');
      body += bsRow4('INCHARGE NAME', '', 'INCHARGE SIGN', '');

      // QC Sampling
      body += bsSec('QC SAMPLING');
      body += bsRow4('SAMPLE COLLECTED', 'YES / NO', 'SAMPLE COLLECTED AT WHICH PROCESS', '');
      body += bsRow4('SAMPLE ID', '', 'SUBMITTED ON', '');
      body += '</table>';
      body += bsFooter(bom, 'Technical Sheet');
      return bsPage(body);
    }

    /* ════════════════════════════════════════════════════════
       FORMULATION BATCH SHEET
    ════════════════════════════════════════════════════════ */
    function formulationSheet(bom, addStoresSignOff) {
      var body = bsHeader(bom, 'FORMULATION BATCH SHEET', { equipment: esc(bom.reactor || bom.batchIncharge || '') });
      body += '<table style="width:100%;border-collapse:collapse">';
      body += bsSec('FORMULATION', '(YES / NO)');
      body += bsRow4('SFG USED', 'YES / NO', 'SFG DI No., D.O.F &amp; QTY USED', '');
      body += bsRow4('CARRIER', '', '', '');
      body += bsRow4('No. OF WORKERS', '', 'M / F / M+F', '');
      body += bsRow4('EQUIPMENT USED (BLENDER / VESSEL)', '', 'HUMIDITY &amp; WEATHER DETAILS', '');
      body += '</table>';

      // Raw Material Details — BOM components pre-printed
      var allComps = (bom.components || []);
      var comps = allComps.filter(function (c) { return c && c.component && !c.isHeader; });
      var sectionOnly = (typeof state !== 'undefined' && state.sectionOnlyBMR === true);

      // Calculate totals per UOM
      var totMap = {};
      comps.forEach(function (c) {
        var uom = (c.uom || '').trim(), qty = parseFloat(c.qty);
        if (uom && !isNaN(qty)) totMap[uom] = (totMap[uom] || 0) + qty;
      });
      var totLines = Object.entries(totMap).map(function (e) {
        return parseFloat(e[1].toFixed(4)) + ' ' + e[0];
      }).join(' &nbsp;|&nbsp; ');

      // Build section groups for sub-totals
      function fmBuildGroups(components) {
        var groups = [], cur = { header: null, items: [] };
        components.forEach(function (c) {
          if (!c || !c.component) return;
          if (c.isHeader) { if (cur.items.length || cur.header) groups.push(cur); cur = { header: c, items: [] }; }
          else cur.items.push(c);
        });
        groups.push(cur);
        return groups;
      }
      function fmSecTotal(items) {
        var m = {};
        items.forEach(function (c) { var u = (c.uom || '-').trim(), q = parseFloat(c.qty); if (!isNaN(q)) m[u] = (m[u] || 0) + q; });
        return Object.entries(m).map(function (e) { return parseFloat(e[1].toFixed(4)) + ' ' + e[0]; }).join(' + ') || '&mdash;';
      }
      var fmGroups = fmBuildGroups(allComps);
      var hasFmSections = fmGroups.some(function (g) { return g.header !== null; });

      body += '<table style="width:100%;border-collapse:collapse;margin-top:1px">';
      body += '<tr style="background:#e0e0e0">'
        + '<th colspan="7" style="border:1px solid #000;padding:3px 6px;font-weight:700;font-size:10pt;text-align:center">RAW MATERIAL DETAILS'
        + (sectionOnly ? ' &nbsp;<span style="font-weight:400;font-size:8.5pt;color:#555">(Section Summary View)</span>' : '')
        + '</th>'
        + '</tr>';

      if (sectionOnly && hasFmSections) {
        // SECTION-ONLY VIEW: one row per section with section total
        body += '<tr>'
          + '<th style="' + BSTH + ';width:5%">S.No.</th>'
          + '<th style="' + BSTH + ';width:38%">SECTION</th>'
          + '<th style="' + BSTH + ';width:16%">SECTION TOTAL QTY</th>'
          + '<th style="' + BSTH + ';width:8%">ADDED &#10003;</th>'
          + '<th style="' + BSTH + ';width:12%">SEQ. <span style="font-weight:400;font-size:7.5pt">(order)</span></th>'
          + '<th style="' + BSTH + ';width:14%">TIME OF ADDITION</th>'
          + '<th style="' + BSTH + '">REMARKS</th>'
          + '</tr>';
        var secSno = 0;
        fmGroups.forEach(function (g) {
          if (!g.header && g.items.length === 0) return;
          if (!g.header) {
            // pre-section items
            g.items.forEach(function (c, idx) {
              body += '<tr style="height:16px">'
                + '<td style="' + BSTD + ';text-align:center">' + (c.sno || String(++secSno)) + '</td>'
                + '<td style="' + BSTD + '">' + esc(c.component) + '</td>'
                + '<td style="' + BSTD + ';text-align:center">' + esc(c.qty || '') + ' ' + esc(c.uom || '') + '</td>'
                + '<td style="' + BSTD + '"></td>'
                + '<td style="' + BSTD + ';text-align:center;font-size:13pt"></td>'
                + '<td style="' + BSTD + '"></td>'
                + '<td style="' + BSTD + '"></td>'
                + '</tr>';
            });
          } else {
            body += '<tr style="background:#d8e8f5">'
              + '<td style="' + BSTD + ';text-align:center;font-weight:700">&#9658;</td>'
              + '<td style="' + BSTD + ';font-weight:700;font-style:italic;color:#1a3f5c">' + esc(g.header.component) + '</td>'
              + '<td style="' + BSTD + ';font-weight:700">' + fmSecTotal(g.items) + '</td>'
              + '<td style="' + BSTD + ';text-align:center;font-size:13pt"></td>'
              + '<td style="' + BSTD + ';text-align:center"></td>'
              + '<td style="' + BSTD + '"></td>'
              + '<td style="' + BSTD + '"></td>'
              + '</tr>';
          }
        });
      } else {
        // FULL VIEW: all components with new cols — Seq, Added tick, Time Added, Remarks
        body += '<tr>'
          + '<th style="' + BSTH + ';width:5%">S.No.</th>'
          + '<th style="' + BSTH + ';width:32%">RAW MATERIAL</th>'
          + '<th style="' + BSTH + ';width:14%">STD QTY &amp; UOM</th>'
          + '<th style="' + BSTH + ';width:7%">SEQ.</th>'
          + '<th style="' + BSTH + ';width:8%">ADDED &#10003;</th>'
          + '<th style="' + BSTH + ';width:12%">TIME ADDED</th>'
          + '<th style="' + BSTH + '">REMARKS</th>'
          + '</tr>';
        var nRows = Math.max(comps.length + 2, 8);
        var allRows = allComps.filter(function (c) { return c && c.component; });
        var sno2 = 0;
        allRows.forEach(function (c) {
          if (c.isHeader) {
            body += '<tr style="background:#d8e8f5">'
              + '<td colspan="7" style="border:1px solid #5585aa;padding:3px 8px;font-weight:700;font-size:9pt;font-style:italic;color:#1a3f5c">&#9658;&nbsp;' + esc(c.component) + '</td>'
              + '</tr>';
            return;
          }
          sno2++;
          body += '<tr style="height:16px">'
            + '<td style="' + BSTD + ';text-align:center">' + esc(c.sno || String(sno2)) + '</td>'
            + '<td style="' + BSTD + '">' + esc(c.component) + '</td>'
            + '<td style="' + BSTD + ';text-align:center">' + esc(c.qty || '') + ' ' + esc(c.uom || '') + '</td>'
            + '<td style="' + BSTD + ';text-align:center;font-size:13pt"></td>'
            + '<td style="' + BSTD + ';text-align:center"></td>'
            + '<td style="' + BSTD + '"></td>'
            + '<td style="' + BSTD + '"></td>'
            + '</tr>';
          // Section sub-total after last item in each named section
          if (hasFmSections) {
            for (var fgi = 0; fgi < fmGroups.length; fgi++) {
              var fg = fmGroups[fgi];
              if (!fg.header || !fg.items.length) continue;
              if (fg.items[fg.items.length - 1] === c) {
                body += '<tr style="background:#eef4ea">'
                  + '<td colspan="3" style="border:1px solid #000;padding:2px 5px;font-weight:700;font-size:8pt;text-align:right;color:#2d5e18;font-style:italic">&#8627; Section Total:</td>'
                  + '<td colspan="4" style="border:1px solid #000;padding:2px 5px;font-weight:700;font-size:8pt;color:#2d5e18">' + fmSecTotal(fg.items) + '</td>'
                  + '</tr>';
                break;
              }
            }
          }
          // Add extra blank rows if needed
        });
        // Blank rows to pad
        var blankCount = Math.max(0, nRows - allRows.length);
        for (var bi = 0; bi < blankCount; bi++) {
          body += '<tr style="height:16px"><td style="' + BSTD + '"></td><td style="' + BSTD + '"></td><td style="' + BSTD + '"></td><td style="' + BSTD + '"></td><td style="' + BSTD + '"></td><td style="' + BSTD + '"></td><td style="' + BSTD + '"></td></tr>';
        }
      }

      // Total row
      body += '<tr style="background:#f5f5f5">'
        + '<td colspan="2" style="border:1px solid #000;padding:3px 5px;font-weight:700;font-size:8.5pt;text-align:center">TOTAL QTY</td>'
        + '<td colspan="5" style="border:1px solid #000;padding:3px 5px;font-weight:700;font-size:8.5pt">' + (totLines || '&mdash;') + '</td>'
        + '</tr>';
      body += '</table>';

      // Process Details
      body += '<table style="width:100%;border-collapse:collapse;margin-top:1px">';
      body += bsSec('PROCESS DETAILS');
      body += bsRow4('TOTAL QTY (kg)', '', 'No. OF WORKERS', '');
      body += bsRow4('RM CHARGING START TIME', '', 'RM CHARGING END TIME', '');
      body += bsRow4('BLENDING START TIME', '', 'BLENDING END TIME', '');
      body += bsRow4('UNLOADING START TIME', '', 'UNLOADING END TIME', '');
      body += bsRow4('WEIGHT AFTER UNLOADING (kg)', '', 'WEIGHT AFTER SIEVING (kg)', '');
      body += bsRow4('SIEVING', 'YES / NO', 'MESH SIZE USED', '');
      body += bsRow4('INCHARGE NAME &amp; SIGN', '', '', '');

      // Deviation Record
      body += bsSec('DEVIATION RECORD');
      body += '<tr><td colspan="4" style="border:1px solid #000;padding:4px 6px;height:40px;vertical-align:top;font-size:8.5pt;color:#aaa">If any deviation from standard process, supervisor to record here:</td></tr>';

      // QC Sampling
      body += bsSec('QC SAMPLING');
      body += bsRow4('SAMPLE COLLECTED', 'YES / NO', 'SAMPLE COLLECTED AT WHICH PROCESS', '');
      body += bsRow4('SAMPLE ID', '', 'SUBMITTED ON', '');
      body += '</table>';
      // If BOMs are skipped, add Stores issuance sign-off here
      if (addStoresSignOff) {
        body += '<table style="width:100%;border-collapse:collapse;margin-top:4px">'
          + '<tr style="background:#fff3e0"><td colspan="4" style="border:1px solid #000;padding:3px 8px;font-weight:700;font-size:9pt;text-align:center;color:#7a3b00">STORES ISSUANCE ACKNOWLEDGEMENT</td></tr>'
          + '<tr>'
          + '<td style="' + BSL + 'width:25%">STORES INCHARGE</td><td style="' + BSV + 'width:25%"></td>'
          + '<td style="' + BSL + 'width:25%">SECTION INCHARGE</td><td style="' + BSV + '"></td>'
          + '</tr><tr>'
          + '<td style="' + BSL + '">SIGNATURE</td><td style="' + BSV + ';height:28px"></td>'
          + '<td style="' + BSL + '">SIGNATURE</td><td style="' + BSV + '"></td>'
          + '</tr><tr>'
          + '<td style="' + BSL + '">DATE &amp; TIME ISSUED</td><td style="' + BSV + '"></td>'
          + '<td style="' + BSL + '">DATE &amp; TIME RECEIVED</td><td style="' + BSV + '"></td>'
          + '</tr></table>';
      }
      body += bsFooter(bom, 'Formulation Sheet');
      return bsPage(body);
    }

    /* ════════════════════════════════════════════════════════
       PACKING BATCH SHEET
    ════════════════════════════════════════════════════════ */
    function packingSheet(bom) {
      var body = bsHeader(bom, 'PACKING BATCH SHEET', { blankOrderQty: true, blankDiNo: true, hideCycle: true, equipment: '' });
      body += '<table style="width:100%;border-collapse:collapse">';

      body += bsSec('PACKING');
      body += bsRow4('DATE OF PACKING (Manual Entry)', '', 'QTY RECEIVED FOR PACKING (kg)', '');
      body += bsRow4('No. OF WORKERS', '', 'TYPE OF PACKING', '');
      body += bsRow4('PRIMARY PACKING', '', 'SECONDARY PACKING', '');
      body += bsRow4('WEIGHT OF UNIT PACKING', '', '', '');
      body += bsRow4('TOTAL QTY PACKED (kg)', '', 'TOTAL UNITS PACKED', '');
      body += bsRow4('UNITS PER CBB / BAG / DRUM', '', 'TOTAL No. OF OUTER PACKAGES', '');

      body += bsSec('LABELLING');
      body += bsRow4('LABELS', 'PACKING SLIPS / COMPUTER LABELS / CUST LABELS', 'LABELLING START TIME', '');
      body += bsRow4('LABELLING END TIME', '', '', '');

      body += bsSec('FINISHING');
      body += bsRow4('STRETCH FILM WRAPPING', 'YES / NO', 'SF START TIME', '');
      body += bsRow4('SF END TIME', '', '', '');
      body += bsRow4('CARRY STRAPPING', 'YES / NO', 'CS START TIME', '');
      body += bsRow4('CS END TIME', '', '', '');
      body += bsRow4('QTY LEFT OVER AFTER PACKING (kg)', '', 'LEFTOVER QTY STORED AT', '');
      body += bsRow4('SGF UPDATED', 'YES / NO', '', '');

      body += bsSec('SAMPLING');
      body += bsRow4('SAMPLE COLLECTED', 'YES / NO', 'SAMPLE COLLECTED AT WHICH PROCESS', '');
      body += bsRow4('SAMPLE ID', '', 'SUBMITTED ON', '');
      body += bsRow4('SENT TO INVENTORY ON', '', 'HANDED OVER TO', '');
      body += bsRow4('TOTAL UNITS SENT', '', 'TIME', '');

      body += bsSec('SIGN-OFF');
      body += '<tr>'
        + '<td style="' + BSL + 'width:18%">INCHARGE NAME</td>'
        + '<td style="' + BSV + 'width:30%"></td>'
        + '<td style="' + BSL + 'width:18%">INCHARGE SIGN</td>'
        + '<td style="' + BSV + '" style="height:28px"></td>'
        + '</tr>';
      body += '</table>';
      body += bsFooter(bom, 'Packing Sheet');
      return bsPage(body);
    }

    /* ════════════════════════════════════════════════════════
       COA — CERTIFICATE OF ANALYSIS
    ════════════════════════════════════════════════════════ */
    function coaSheet(bom) {
      // ── Letterhead ──
      var body = '<div style="display:flex;align-items:center;justify-content:center;gap:10px;border-bottom:2.5px solid #000;padding-bottom:3px;margin-bottom:2px">'
        + '<img src="' + BS_LOGO + '" style="height:52px;width:auto"/>'
        + '<div style="text-align:center">'
        + '<div style="font-weight:700;font-size:17pt;letter-spacing:1px;font-family:Georgia,serif">SOM PHYTO PHARMA INDIA LTD</div>'
        + '<div style="font-size:8.5pt;margin-top:1px">Plot No. 154/A5-1 5VICE, IDA Bollaram - 502325 &nbsp;|&nbsp; +91 9885438365</div>'
        + '</div></div>'
        + '<div style="text-align:center;font-weight:700;font-size:12pt;background:#2d5e18;color:#fff;border:1.5px solid #000;padding:4px 0;letter-spacing:1px;margin-bottom:0">CERTIFICATE OF ANALYSIS</div>';

      // ── Product Details + Manufacturing Details (2-column layout matching image) ──
      /*
       COA header — matches reference image layout:
       Left col (~65%): PRODUCT DETAILS — Product Name, DI No, Carrier,
                        Sent On + COA No, Sent By + Section,
                        Composition, Date of Analysis + Analyst Name
       Right col (~35%): MANUFACTURING DETAILS — Batch Number, Batch Size, Date of MFG
       Using a 2-panel approach: left table + right table side by side via flex
      */
      body += '<table style="width:100%;border-collapse:collapse;table-layout:fixed">'
        // ── Section header row ──
        + '<tr style="background:#e8e8e8">'
        + '<td colspan="4" style="border:1px solid #000;padding:4px 6px;font-weight:700;font-size:10pt;text-align:center;width:65%">PRODUCT DETAILS</td>'
        + '<td colspan="2" style="border:1px solid #000;padding:4px 6px;font-weight:700;font-size:10pt;text-align:center;width:35%">MANUFACTURING DETAILS</td>'
        + '</tr>'

        // Row 1: Product Name (spans left 65%) | Batch Number (right 35%)
        + '<tr>'
        + '<td style="' + BSL + ';width:18%">PRODUCT NAME</td>'
        + '<td style="' + BSV + ';font-weight:700;font-size:10.5pt;width:47%" colspan="3"><b>' + esc(bom.productName) + '</b></td>'
        + '<td style="' + BSL + ';width:17%">BATCH NUMBER</td>'
        + '<td style="' + BSV + ';font-weight:700;width:18%"><b>' + esc(bom.batchNo) + '</b></td>'
        + '</tr>'

        // Row 2: DI No (left) | Batch Size (right)
        + '<tr>'
        + '<td style="' + BSL + '">DI No.</td>'
        + '<td style="' + BSV + '" colspan="3">' + esc(bom.diNumber || '') + '</td>'
        + '<td style="' + BSL + '">BATCH SIZE</td>'
        + '<td style="' + BSV + '">' + esc(bom.batchSize || '') + ' ' + esc(bom.batchSizeUom || '') + '</td>'
        + '</tr>'

        // Row 3: Carrier (full left) | Date of MFG (right, pre-filled)
        + '<tr>'
        + '<td style="' + BSL + '">CARRIER</td>'
        + '<td style="' + BSV + '" colspan="3"></td>'
        + '<td style="' + BSL + '">DATE OF MFG</td>'
        + '<td style="' + BSV + '">' + fmtDate(bom.dateRequisition) + '</td>'
        + '</tr>'

        // Row 4: Sent On + COA No (split left half each) | right side continues (empty, merged from above)
        + '<tr>'
        + '<td style="' + BSL + '">SENT ON</td>'
        + '<td style="' + BSV + '"></td>'
        + '<td style="' + BSL + '">COA No.</td>'
        + '<td style="' + BSV + '"></td>'
        + '<td style="border:1px solid #000;background:#f0f0f0" colspan="2"></td>'
        + '</tr>'

        // Row 5: Sent By + Section (split left half each) | right empty
        + '<tr>'
        + '<td style="' + BSL + '">SENT BY</td>'
        + '<td style="' + BSV + '"></td>'
        + '<td style="' + BSL + '">SECTION</td>'
        + '<td style="' + BSV + '"></td>'
        + '<td style="border:1px solid #000;background:#f0f0f0" colspan="2"></td>'
        + '</tr>'

        // Row 6: Composition — full width
        + '<tr>'
        + '<td style="' + BSL + '">COMPOSITION</td>'
        + '<td style="' + BSV + '" colspan="5"></td>'
        + '</tr>'

        // Row 7: Date of Analysis + Analyst Name — equal halves across full width
        + '<tr>'
        + '<td style="' + BSL + '">DATE OF ANALYSIS</td>'
        + '<td style="' + BSV + '" colspan="2"></td>'
        + '<td style="' + BSL + '">ANALYST NAME</td>'
        + '<td style="' + BSV + '" colspan="2"></td>'
        + '</tr>'

        + '</table>';

      // ── Laboratory Analysis heading ──
      body += '<div style="font-weight:700;font-size:9.5pt;border:1px solid #000;border-top:none;padding:3px 6px;background:#f0f0f0">LABORATORY ANALYSIS</div>';

      // ── Parameters table ──
      // Format: [sno, label, spec, isSubRow, isGroupHeader]
      // isGroupHeader = bold full-width section within table
      var TH = 'border:1px solid #000;padding:3px 5px;font-weight:700;font-size:8.5pt;text-align:center;background:#e0e0e0;';
      var TD = 'border:1px solid #000;padding:2px 5px;font-size:8.5pt;';
      var TDc = 'border:1px solid #000;padding:2px 5px;font-size:8.5pt;text-align:center;';
      var TDBOLD = 'border:1px solid #000;padding:2px 5px;font-size:8.5pt;font-weight:700;';

      body += '<table style="width:100%;border-collapse:collapse">'
        + '<tr>'
        + '<th style="' + TH + ';width:5%">S.No</th>'
        + '<th style="' + TH + ';width:35%">TESTING / PARAMETER</th>'
        + '<th style="' + TH + ';width:35%">SPECIFICATION</th>'
        + '<th style="' + TH + ';width:15%">RESULT</th>'
        + '<th style="' + TH + ';width:10%">STATUS</th>'
        + '</tr>';

      // Row helper
      function pr(sno, label, spec, result, bold, bg) {
        var b = bold ? 'font-weight:700;' : '';
        var background = bg || (bold ? '#f5f5f5' : '#fff');
        body += '<tr style="background:' + background + ';height:17px">'
          + '<td style="' + TD + b + 'text-align:center">' + sno + '</td>'
          + '<td style="' + TD + b + '">' + label + '</td>'
          + '<td style="' + TDc + b + '">' + spec + '</td>'
          + '<td style="' + TD + '"></td>'
          + '<td style="' + TDc + '">' + result + '</td>'
          + '</tr>';
      }
      function prSub(sno, label, spec, result) {
        body += '<tr style="height:16px">'
          + '<td style="' + TD + 'text-align:center;color:#666">' + sno + '</td>'
          + '<td style="border:1px solid #000;padding:2px 5px 2px 14px;font-size:8.5pt;font-style:italic">' + label + '</td>'
          + '<td style="' + TDc + '">' + spec + '</td>'
          + '<td style="' + TD + '"></td>'
          + '<td style="' + TDc + '">' + result + '</td>'
          + '</tr>';
      }

      pr('1', 'Material Physiology / Appearance (Visual)', '', '', '', '#fff');
      pr('2', 'Colour', '', '', '', '#f9f9f9');
      pr('3', 'Odour', '', '', '', '#fff');
      pr('4', 'Solubility', '&gt; 90% Water Soluble', '', '', '#f9f9f9');
      pr('5', 'Mesh Size', '90% with 100 #', '', '', '#fff');
      pr('6', 'Moisture (Loss on drying at 60°C for 4h)', 'Max 5%', '', '', '#f9f9f9');
      pr('7', 'pH', '', '', '', '#fff');
      pr('8', 'Specific Gravity', '', '', '', '#f9f9f9');
      pr('9', 'Flash Point', '', '', '', '#fff');
      pr('10', 'Emulsion Stability Test', '', '', '', '#f9f9f9');
      pr('11', 'Morphology (Gram\'s Staining)', '', '', '', '#fff');
      pr('12', 'Colony-Forming Unit (CFU) Assay (Pour Plate Method)', '', '', '', '#e8e8e8');
      prSub('a', 'Culture / Organism Assay', '', '');
      prSub('b', 'Total Potency / CFU Count (per g / mL)', '', '');
      pr('13', 'Total Plate Count (TPC)', '', '', '', '#f9f9f9');
      pr('14', 'Yeast &amp; Mould Count', '', '', '', '#fff');
      pr('15', 'Heavy Metals (PPM)', '', '', '', '#e8e8e8');
      prSub('a', 'Arsenic', 'NMT 0.3 PPM', '');
      prSub('b', 'Cadmium', 'NMT 1.0 PPM', '');
      prSub('c', 'Lead', 'NMT 1.0 PPM', '');
      prSub('d', 'Mercury', 'NMT 0.05 PPM', '');
      pr('16', 'Pathogens Testing', 'NMT 10 CFU/g', '', '', '#e8e8e8');
      prSub('a', 'Total Coliform Count', 'NMT 10 CFU/g', 'Absent');
      prSub('b', 'Escherichia coli', 'Absent / g', 'Absent');
      prSub('c', 'Salmonella sp.', 'Absent / g', 'Absent');
      prSub('d', 'Staphylococcus aureus', 'Absent / g', 'Absent');
      prSub('e', 'Pseudomonas aeruginosa', 'Absent / g', 'Absent');
      pr('17', 'Other Microbiological Contaminants', '', '', '', '#f9f9f9');
      pr('18', 'Specific Assay / Test 1', '', '', '', '#fff');
      pr('19', 'Specific Assay / Test 2', '', '', '', '#f9f9f9');
      pr('20', 'Specific Assay / Test 3', '', '', '', '#fff');
      body += '</table>';

      // ── Declaration ──
      body += '<div style="border:1px solid #000;border-top:none;padding:5px 8px;font-size:8pt;background:#fffdf0;font-style:italic">'
        + 'The above product has been tested and found to comply with the specified quality standards. '
        + 'Shelf life of the product may vary depending upon the excipient(s) used in final product.'
        + '</div>';

      // ── 3 Signature boxes: Analyzed By | Checked By | Approved By ──
      body += '<table style="width:100%;border-collapse:collapse;margin-top:4px">'
        + '<tr>'
        + '<td style="border:2px solid #000;padding:5px 8px;font-weight:700;font-size:9pt;text-align:center;width:32%;background:#f0f0f0">ANALYZED BY</td>'
        + '<td style="width:2%;border:none"></td>'
        + '<td style="border:2px solid #000;padding:5px 8px;font-weight:700;font-size:9pt;text-align:center;width:32%;background:#f0f0f0">CHECKED BY</td>'
        + '<td style="width:2%;border:none"></td>'
        + '<td style="border:2px solid #000;padding:5px 8px;font-weight:700;font-size:9pt;text-align:center;width:32%;background:#f0f0f0">APPROVED BY</td>'
        + '</tr><tr>'
        + '<td style="border-left:2px solid #000;border-right:2px solid #000;padding:3px 8px 2px;font-size:8.5pt">Name :</td>'
        + '<td style="border:none"></td>'
        + '<td style="border-left:2px solid #000;border-right:2px solid #000;padding:3px 8px 2px;font-size:8.5pt">Name :</td>'
        + '<td style="border:none"></td>'
        + '<td style="border-left:2px solid #000;border-right:2px solid #000;padding:3px 8px 2px;font-size:8.5pt">Name :</td>'
        + '</tr><tr>'
        + '<td style="border-left:2px solid #000;border-right:2px solid #000;padding:2px 8px;font-size:8.5pt">Dept. :</td>'
        + '<td style="border:none"></td>'
        + '<td style="border-left:2px solid #000;border-right:2px solid #000;padding:2px 8px;font-size:8.5pt">Dept. :</td>'
        + '<td style="border:none"></td>'
        + '<td style="border-left:2px solid #000;border-right:2px solid #000;padding:2px 8px;font-size:8.5pt">Dept. :</td>'
        + '</tr><tr>'
        + '<td style="border:2px solid #000;border-top:1px solid #bbb;padding:18px 8px 5px;font-size:8.5pt">Sign &amp; Date :</td>'
        + '<td style="border:none"></td>'
        + '<td style="border:2px solid #000;border-top:1px solid #bbb;padding:18px 8px 5px;font-size:8.5pt">Sign &amp; Date :</td>'
        + '<td style="border:none"></td>'
        + '<td style="border:2px solid #000;border-top:1px solid #bbb;padding:18px 8px 5px;font-size:8.5pt">Sign &amp; Date :</td>'
        + '</tr></table>';

      body += bsFooter(bom, 'Certificate of Analysis');
      return bsPage(body);
    }


    /* ════════════════════════════════════════════════════════
       NANO BATCH REPORT — NANO TECHNOLOGY PLANT
       3 A4 pages + QC Form
    ════════════════════════════════════════════════════════ */

    var NANO_LOGO = 'data:image/png;base64,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';

    /* shared nano header */
    function nanoHdr(bom) {
      return '<div style="display:flex;align-items:center;gap:10px;border-bottom:2.5px solid #000;padding-bottom:3px;margin-bottom:3px">'
        + '<img src="' + NANO_LOGO + '" style="height:52px;width:auto"/>'
        + '<div style="text-align:center;flex:1">'
        + '<div style="font-weight:700;font-size:17pt;letter-spacing:1px;font-family:Georgia,serif">SOM PHYTO PHARMA INDIA LTD.,</div>'
        + '<div style="font-size:8.5pt">Plot No. 154/A5-1 SVICE, IDA Bollaram - 502325 &nbsp;|&nbsp; +91 9885438365</div>'
        + '</div></div>'
        + '<div style="text-align:center;font-weight:700;font-size:12pt;background:#1a3a6b;color:#fff;padding:4px 0;letter-spacing:1px;margin-bottom:2px">BATCH REPORT — COMMERCIAL &nbsp;|&nbsp; NANO TECHNOLOGY PLANT</div>'
        // pre-filled batch info
        + '<table style="width:100%;border-collapse:collapse">'
        + '<tr>'
        + '<td style="' + NL + 'width:18%">PRODUCT NAME</td><td style="' + NV + 'font-weight:700;font-size:10pt;width:32%"><b>' + esc(bom.productName) + '</b></td>'
        + '<td style="' + NL + 'width:20%">CUSTOMER PRODUCT NAME</td><td style="' + NV + '">' + '' + '</td>'
        + '</tr><tr>'
        + '<td style="' + NL + '">DATE OF MFG</td><td style="' + NV + '">' + fmtDate(bom.dateRequisition) + '</td>'
        + '<td style="' + NL + '">ORDER QTY</td><td style="' + NV + 'font-weight:700">' + esc(bom.batchSize || '') + ' ' + esc(bom.batchSizeUom || '') + '</td>'
        + '</tr><tr>'
        + '<td style="' + NL + '">BATCH SIZE</td><td style="' + NV + '">' + esc(bom.batchSize || '') + ' ' + esc(bom.batchSizeUom || '') + '</td>'
        + '<td style="' + NL + '">DI NO</td><td style="' + NV + '">' + esc(bom.diNumber || '') + '</td>'
        + '</tr><tr>'
        + '<td style="' + NL + '">BATCH CODE</td><td style="' + NV + 'font-weight:700"><b>' + esc(bom.batchNo) + '</b></td>'
        + '<td style="' + NL + '">REACTOR TO BE USED</td><td style="' + NV + '">' + esc(bom.reactor || '') + '</td>'
        + '</tr>'
        + '</table>';
    }

    /* tick box helper — prints a small square */
    function ntick(label) {
      return '<span style="display:inline-flex;align-items:center;gap:3px;margin-right:10px">'
        + '<span style="display:inline-block;width:12px;height:12px;border:1.5px solid #000;vertical-align:middle"></span>'
        + '<span style="font-size:8.5pt">' + label + '</span></span>';
    }
    /* two-option tick */
    function nyn() { return ntick('YES') + ntick('NO'); }

    var NL = 'padding:3px 5px;font-weight:700;font-size:8.5pt;border:1px solid #000;background:#f0f0f0;';
    var NV = 'padding:3px 5px;font-size:9pt;border:1px solid #000;';
    var NTH = 'border:1px solid #000;padding:3px 4px;font-weight:700;font-size:8.5pt;text-align:center;background:#d0d8e8;';
    var NTD = 'border:1px solid #000;padding:2px 4px;font-size:8.5pt;height:16px;';

    function nanoFooter(bom, pg) {
      return '<div style="margin-top:3px;font-size:8pt;color:#555;display:flex;justify-content:space-between;border-top:0.5px solid #bbb;padding-top:2px">'
        + '<span>NANO Batch Report | BOM: ' + esc(bom.bomNo) + ' | Batch: ' + esc(bom.batchNo) + '</span>'
        + '<span>Page ' + pg + ' | Cycle ' + bom.cycleNo + '/' + bom.totalCycles + '</span>'
        + '<span>SOM PHYTO PHARMA INDIA LTD.</span></div>';
    }

    /* ── PAGE 1: Batch Header + Pre-Start Checklist ── */
    function nanoSheet1(bom) {
      var body = nanoHdr(bom);

      // Checklist
      body += '<div style="font-weight:700;font-size:9.5pt;border:1px solid #000;border-top:none;padding:3px 6px;background:#d0d8e8;margin-top:2px">PRE-START CHECK LIST</div>';
      body += '<table style="width:100%;border-collapse:collapse">';

      // Row 1: Lights
      body += '<tr>'
        + '<td style="' + NL + 'width:4%;text-align:center">1</td>'
        + '<td style="' + NL + 'width:36%">PLANT / BUILDING LIGHTS SWITCH ON TIME</td>'
        + '<td style="' + NV + '"></td>'
        + '<td style="' + NL + 'width:4%;text-align:center">2</td>'
        + '<td style="' + NL + 'width:26%">REACTORS LIGHT SWITCH ON TIME</td>'
        + '<td style="' + NV + '"></td>'
        + '</tr>';

      // Row 2: Discharge tank
      body += '<tr>'
        + '<td style="' + NL + 'text-align:center">3</td>'
        + '<td style="' + NL + '">DISCHARGE TANK STATUS</td>'
        + '<td style="' + NV + '" colspan="4">' + ntick('EMPTY') + '<span style="font-size:8.5pt">TIME: ____________</span>&nbsp;&nbsp;' + ntick('NOT EMPTY') + '</td>'
        + '</tr>';

      // Row 3&4: Health conditions with Good/Unwell ticks + write box
      body += '<tr>'
        + '<td style="' + NL + 'text-align:center">4</td>'
        + '<td style="' + NL + '">HEALTH — PLANT ENGINEERS</td>'
        + '<td style="' + NV + '" colspan="4">' + ntick('GOOD') + '' + ntick('UNWELL') + '<span style="font-size:8pt;color:#888">If unwell: </span><span style="display:inline-block;border-bottom:1px solid #999;width:120px">&nbsp;</span></td>'
        + '</tr><tr>'
        + '<td style="' + NL + 'text-align:center">5</td>'
        + '<td style="' + NL + '">HEALTH — PLANT WORKERS / HELPERS</td>'
        + '<td style="' + NV + '" colspan="4">' + ntick('GOOD') + '' + ntick('UNWELL') + '<span style="font-size:8pt;color:#888">If unwell: </span><span style="display:inline-block;border-bottom:1px solid #999;width:120px">&nbsp;</span></td>'
        + '</tr>';
      body += '</table>';

      // Documents + Water + PPE in 3-column layout
      body += '<table style="width:100%;border-collapse:collapse;margin-top:1px">';
      body += '<tr style="background:#d0d8e8">'
        + '<th colspan="2" style="' + NTH + ';width:38%">DOCUMENTS REQUIRED</th>'
        + '<th colspan="2" style="' + NTH + ';width:28%">WATER</th>'
        + '<th colspan="2" style="' + NTH + '">PPE CHECK</th>'
        + '</tr>';
      body += '<tr>'
        + '<td style="' + NL + 'width:18%">RAW MATERIAL SHEET</td><td style="' + NV + 'width:20%">' + nyn() + '</td>'
        + '<td style="' + NL + 'width:12%">RAW WATER QTY</td><td style="' + NV + 'width:16%"></td>'
        + '<td style="' + NL + 'width:18%">EYE GLASSES</td><td style="' + NV + '">' + nyn() + '</td>'
        + '</tr><tr>'
        + '<td style="' + NL + '">PROCEDURE SHEET</td><td style="' + NV + '">' + nyn() + '</td>'
        + '<td style="' + NL + '">DM WATER QTY</td><td style="' + NV + '"></td>'
        + '<td style="' + NL + '">MASK</td><td style="' + NV + '">' + nyn() + '</td>'
        + '</tr><tr>'
        + '<td style="' + NL + '">RM REMARKS</td><td style="' + NV + '"></td>'
        + '<td colspan="2" style="border:1px solid #000;background:#f5f5f5"></td>'
        + '<td style="' + NL + '">HELMET</td><td style="' + NV + '">' + nyn() + '</td>'
        + '</tr><tr>'
        + '<td colspan="4" style="border:1px solid #000;background:#f5f5f5"></td>'
        + '<td style="' + NL + '">RUBBER GLOVES</td><td style="' + NV + '">' + nyn() + '</td>'
        + '</tr><tr>'
        + '<td colspan="4" style="border:1px solid #000;background:#f5f5f5"></td>'
        + '<td style="' + NL + '">HAND MITTS</td><td style="' + NV + '">' + nyn() + '</td>'
        + '</tr>';
      body += '</table>';

      // Maintenance + Tools
      body += '<table style="width:100%;border-collapse:collapse;margin-top:1px">';
      body += '<tr>'
        + '<td style="' + NL + 'width:36%">REACTOR CHECKED BY MAINTENANCE TEAM</td>'
        + '<td style="' + NV + 'width:28%">' + nyn() + '</td>'
        + '<td style="' + NL + 'width:16%">TOOLS USED</td>'
        + '<td style="' + NV + '"></td>'
        + '</tr>';
      body += '</table>';

      body += nanoFooter(bom, '1 of 4');
      return '<div class="bom-page"><div class="bom-scale" style="padding:5mm 6mm 4mm">' + body + '</div></div>';
    }

    /* ── PAGE 2: Reactor Cleaning + Batch Start + DM Water + Heating/Cold ── */
    function nanoSheet2(bom) {
      var body = nanoHdr(bom);

      // Reactor Cleaning
      body += '<div style="font-weight:700;font-size:9.5pt;border:1px solid #000;padding:3px 6px;background:#d0d8e8;margin-top:2px">REACTOR CLEANING</div>';
      body += '<table style="width:100%;border-collapse:collapse">';
      body += '<tr>'
        + '<td style="' + NL + 'width:22%">REACTOR CLEANING</td>'
        + '<td style="' + NV + 'width:28%">' + nyn() + '</td>'
        + '<td style="' + NL + 'width:22%">RAW WATER (CLEANING)</td>'
        + '<td style="' + NV + '"></td>'
        + '</tr><tr>'
        + '<td style="' + NL + '">PREVIOUS BATCH PRODUCT</td>'
        + '<td style="' + NV + '"></td>'
        + '<td style="' + NL + '">DM WATER CLEANING DONE</td>'
        + '<td style="' + NV + '">' + nyn() + '</td>'
        + '</tr><tr>'
        + '<td style="' + NL + '">PREVIOUS BATCH DATE</td>'
        + '<td style="' + NV + '"></td>'
        + '<td style="' + NL + '">STEAM CLEANING</td>'
        + '<td style="' + NV + '">' + nyn() + '</td>'
        + '</tr><tr>'
        + '<td style="' + NL + '">PREVIOUS BATCH QTY</td>'
        + '<td style="' + NV + '"></td>'
        + '<td style="' + NL + '">REACTOR CHECK BY MAINT.</td>'
        + '<td style="' + NV + '">' + nyn() + '</td>'
        + '</tr><tr>'
        + '<td style="' + NL + '">MAINTENANCE INCHARGE NAME</td>'
        + '<td style="' + NV + '" colspan="3"></td>'
        + '</tr>';
      body += '</table>';

      // RM Received + Batch Start
      body += '<table style="width:100%;border-collapse:collapse;margin-top:1px">';
      body += '<tr style="background:#d0d8e8"><th colspan="4" style="' + NTH + '">RAW MATERIAL RECEIVED &amp; BATCH START</th></tr>';
      body += '<tr>'
        + '<td style="' + NL + 'width:22%">RM RECEIVED DATE</td><td style="' + NV + 'width:28%"></td>'
        + '<td style="' + NL + 'width:22%">RM RECEIVED TIME</td><td style="' + NV + '"></td>'
        + '</tr><tr>'
        + '<td style="' + NL + '">BATCH START TIME</td><td style="' + NV + '"></td>'
        + '<td style="' + NL + '">BATCH START TEMPERATURE</td><td style="' + NV + '"></td>'
        + '</tr>';
      body += '</table>';

      // DM Water Discharge
      body += '<div style="font-weight:700;font-size:9.5pt;border:1px solid #000;padding:3px 6px;background:#d0d8e8;margin-top:2px">DM WATER DISCHARGE</div>';
      body += '<table style="width:100%;border-collapse:collapse">';
      body += '<tr>'
        + '<td style="' + NL + 'width:18%">START TIME</td><td style="' + NV + 'width:15%"></td>'
        + '<td style="' + NL + 'width:18%">START TEMP</td><td style="' + NV + 'width:15%"></td>'
        + '<td style="' + NL + 'width:18%">START METER READING</td><td style="' + NV + '"></td>'
        + '</tr><tr>'
        + '<td style="' + NL + '" colspan="2">CHECKED FOR WATER CONTAMINATION</td>'
        + '<td style="' + NV + '" colspan="4">' + nyn() + '</td>'
        + '</tr><tr>'
        + '<td style="' + NL + '">END TIME</td><td style="' + NV + '"></td>'
        + '<td style="' + NL + '">END TEMP</td><td style="' + NV + '"></td>'
        + '<td style="' + NL + '">END METER READING</td><td style="' + NV + '"></td>'
        + '</tr>';
      body += '</table>';

      // Heating + Cold Process side by side
      body += '<table style="width:100%;border-collapse:collapse;margin-top:1px">';
      body += '<tr style="background:#d0d8e8">'
        + '<th colspan="2" style="' + NTH + ';width:50%">HEATING PROCESS</th>'
        + '<th colspan="2" style="' + NTH + '">COLD PROCESS</th>'
        + '</tr>';
      body += '<tr>'
        + '<td style="' + NL + 'width:22%">PRESENT TEMP</td><td style="' + NV + 'width:28%"></td>'
        + '<td style="' + NL + 'width:22%">PRESENT TEMP</td><td style="' + NV + '"></td>'
        + '</tr><tr>'
        + '<td style="' + NL + '">STEAM START TEMP</td><td style="' + NV + '"></td>'
        + '<td style="' + NL + '">MIN TEMP</td><td style="' + NV + '"></td>'
        + '</tr><tr>'
        + '<td style="' + NL + '">MAX TEMP REACHED</td><td style="' + NV + '"></td>'
        + '<td colspan="2" style="border:1px solid #000;background:#f5f5f5"></td>'
        + '</tr>';
      body += '</table>';

      body += nanoFooter(bom, '2 of 4');
      return '<div class="bom-page"><div class="bom-scale" style="padding:5mm 6mm 4mm">' + body + '</div></div>';
    }

    /* ── PAGE 3: Batch Formulation Protocol + Close-out + Sign-offs ── */
    function nanoSheet3(bom) {
      var body = nanoHdr(bom);

      // Formulation Protocol — pre-fill RMs from BOM
      var comps = (bom.components || []).filter(function (c) { return c && c.component && !c.isHeader; });
      var totalRows = Math.max(comps.length + 5, 20); // at least 20 rows, extras blank

      body += '<table style="width:100%;border-collapse:collapse;margin-top:2px">';
      body += '<tr style="background:#1a3a6b">'
        + '<th colspan="6" style="border:1px solid #000;padding:4px 6px;font-weight:700;font-size:10pt;text-align:center;color:#fff;letter-spacing:0.5px">BATCH FORMULATION PROTOCOL</th>'
        + '</tr>';
      body += '<tr style="background:#d0d8e8">'
        + '<th style="' + NTH + ';width:5%">STEP</th>'
        + '<th style="' + NTH + ';width:34%">RAW MATERIAL</th>'
        + '<th style="' + NTH + ';width:12%">QUANTITY</th>'
        + '<th style="' + NTH + ';width:10%">TICK &#10003;</th>'
        + '<th style="' + NTH + ';width:14%">TIME</th>'
        + '<th style="' + NTH + ';width:14%">TEMP (°C)</th>'
        + '<th style="' + NTH + '">REMARKS</th>'
        + '</tr>';

      for (var i = 0; i < totalRows; i++) {
        var c = comps[i] || null;
        body += '<tr style="height:15px">'
          + '<td style="' + NTD + ';text-align:center;background:#f0f0f0;font-weight:700">' + (i + 1) + '</td>'
          + '<td style="' + NTD + '">' + (c ? esc(c.component) : '') + '</td>'
          + '<td style="' + NTD + ';text-align:center">' + (c ? esc(c.qty || '') + ' ' + esc(c.uom || '') : '') + '</td>'
          + '<td style="' + NTD + ';text-align:center;font-size:13pt"></td>'
          + '<td style="' + NTD + '"></td>'
          + '<td style="' + NTD + '"></td>'
          + '<td style="' + NTD + '"></td>'
          + '</tr>';
      }
      body += '</table>';

      // Remarks
      body += '<table style="width:100%;border-collapse:collapse;margin-top:1px">';
      body += '<tr><td style="' + NL + 'width:12%">REMARKS</td><td style="' + NV + ';height:22px"></td></tr>';

      // Steam/Cooling close-out
      body += '<tr style="background:#d0d8e8"><td colspan="2" style="border:1px solid #000;padding:3px 6px;font-weight:700;font-size:9pt;text-align:center">BATCH CLOSE-OUT</td></tr>';
      body += '</table>';

      body += '<table style="width:100%;border-collapse:collapse;margin-top:1px">';
      body += '<tr>'
        + '<td style="' + NL + 'width:24%">STEAM CLOSE TIME</td><td style="' + NV + 'width:26%"></td>'
        + '<td style="' + NL + 'width:24%">COOLING START TIME</td><td style="' + NV + '"></td>'
        + '</tr><tr>'
        + '<td style="' + NL + '">STEAM CLOSE TEMP</td><td style="' + NV + '"></td>'
        + '<td style="' + NL + '">COOLING CLOSE TEMP</td><td style="' + NV + '"></td>'
        + '</tr><tr>'
        + '<td style="' + NL + '">REACTOR CLOSING SWITCH OFF TIME</td><td style="' + NV + '"></td>'
        + '<td style="' + NL + '">SWITCH OFF TEMP</td><td style="' + NV + '"></td>'
        + '</tr><tr>'
        + '<td style="' + NL + '">NUMBER OF SAMPLES TAKEN</td><td style="' + NV + '"></td>'
        + '<td style="' + NL + '">BATCH COMPARISON NOTES</td><td style="' + NV + '"></td>'
        + '</tr>';
      body += '</table>';

      // Sign-offs
      body += '<table style="width:100%;border-collapse:collapse;margin-top:5px">';
      body += '<tr>'
        + '<td style="border:2px solid #000;padding:6px 8px;font-weight:700;font-size:9.5pt;text-align:center;width:24%;background:#d0d8e8">SUPERVISOR</td>'
        + '<td style="width:1%;border:none"></td>'
        + '<td style="border:2px solid #000;padding:6px 8px;font-weight:700;font-size:9.5pt;text-align:center;width:24%;background:#d0d8e8">CHECKED BY</td>'
        + '<td style="width:1%;border:none"></td>'
        + '<td style="border:2px solid #000;padding:6px 8px;font-weight:700;font-size:9.5pt;text-align:center;width:24%;background:#d0d8e8">INCHARGE</td>'
        + '<td style="width:1%;border:none"></td>'
        + '<td style="border:2px solid #000;padding:6px 8px;font-weight:700;font-size:9.5pt;text-align:center;width:25%;background:#d0d8e8">MANAGER</td>'
        + '</tr><tr>'
        + '<td style="border-left:2px solid #000;border-right:2px solid #000;padding:22px 8px 5px;font-size:8.5pt">Sign &amp; Date:</td>'
        + '<td style="border:none"></td>'
        + '<td style="border-left:2px solid #000;border-right:2px solid #000;padding:22px 8px 5px;font-size:8.5pt">Sign &amp; Date:</td>'
        + '<td style="border:none"></td>'
        + '<td style="border-left:2px solid #000;border-right:2px solid #000;padding:22px 8px 5px;font-size:8.5pt">Sign &amp; Date:</td>'
        + '<td style="border:none"></td>'
        + '<td style="border-left:2px solid #000;border-right:2px solid #000;padding:22px 8px 5px;font-size:8.5pt">Sign &amp; Date:</td>'
        + '</tr><tr>'
        + '<td style="border:2px solid #000;border-top:1px solid #bbb;padding:7px 8px;font-size:8.5pt">Name:</td>'
        + '<td style="border:none"></td>'
        + '<td style="border:2px solid #000;border-top:1px solid #bbb;padding:7px 8px;font-size:8.5pt">Name:</td>'
        + '<td style="border:none"></td>'
        + '<td style="border:2px solid #000;border-top:1px solid #bbb;padding:7px 8px;font-size:8.5pt">Name:</td>'
        + '<td style="border:none"></td>'
        + '<td style="border:2px solid #000;border-top:1px solid #bbb;padding:7px 8px;font-size:8.5pt">Name:</td>'
        + '</tr></table>';

      body += nanoFooter(bom, '3 of 4');
      return '<div class="bom-page"><div class="bom-scale" style="padding:5mm 6mm 4mm">' + body + '</div></div>';
    }

    /* ── PAGE 4: QC Form ── */
    function nanoQcSheet(bom) {
      var body = nanoHdr(bom);

      body += '<div style="text-align:center;font-weight:700;font-size:12pt;background:#1a3a6b;color:#fff;padding:4px 0;letter-spacing:1px;margin:3px 0">QC FORM</div>';
      body += '<table style="width:100%;border-collapse:collapse">';
      body += '<tr>'
        + '<td style="' + NL + 'width:26%">NUMBER OF SAMPLES TAKEN/SENT</td><td style="' + NV + 'width:24%"></td>'
        + '<td style="' + NL + 'width:22%">SAMPLES SENT TO QC</td><td style="' + NV + '">' + nyn() + '</td>'
        + '</tr><tr>'
        + '<td style="' + NL + '">SAMPLES SENT DATE</td><td style="' + NV + '"></td>'
        + '<td style="' + NL + '">SAMPLES SENT TIME</td><td style="' + NV + '"></td>'
        + '</tr><tr>'
        + '<td style="' + NL + '">PREVIOUS BATCH DETAILS</td><td style="' + NV + '" colspan="3"></td>'
        + '</tr>';
      body += '</table>';

      body += '<div style="font-weight:700;font-size:9.5pt;border:1px solid #000;border-top:none;padding:3px 6px;background:#d0d8e8">QC REPORT</div>';
      body += '<table style="width:100%;border-collapse:collapse">';

      var params = ['COLOUR', 'SMELL', 'TURBIDITY', 'pH', 'SPECIFIC GRAVITY (SPGR)', 'VISCOSITY'];
      params.forEach(function (p, i) {
        var bg = i % 2 === 0 ? '#fff' : '#f9f9f9';
        body += '<tr style="background:' + bg + ';height:18px">'
          + '<td style="' + NL + 'width:28%">' + p + '</td>'
          + '<td style="' + NV + '"></td>'
          + '</tr>';
      });

      // Active Ingredients — taller
      body += '<tr><td style="' + NL + '">ACTIVE INGREDIENTS</td><td style="' + NV + ';height:36px;vertical-align:top"></td></tr>';

      // Stability table
      body += '<tr style="background:#d0d8e8"><td colspan="2" style="border:1px solid #000;padding:3px 6px;font-weight:700;font-size:9pt;text-align:center">PRODUCT STABILITY</td></tr>';
      body += '</table>';

      body += '<table style="width:100%;border-collapse:collapse;margin-top:1px">';
      body += '<tr style="background:#d0d8e8">'
        + '<th style="' + NTH + ';width:26%">CONDITION</th>'
        + '<th style="' + NTH + '">12 HOURS</th>'
        + '<th style="' + NTH + '">24 HOURS</th>'
        + '<th style="' + NTH + '">48 HOURS</th>'
        + '<th style="' + NTH + '">72 HOURS</th>'
        + '</tr>';
      body += '<tr style="height:20px"><td style="' + NTD + ';font-weight:700">AT ROOM TEMP (RT)</td><td style="' + NTD + '"></td><td style="' + NTD + '"></td><td style="' + NTD + '"></td><td style="' + NTD + '"></td></tr>';
      body += '<tr style="height:20px"><td style="' + NTD + ';font-weight:700">AT 4°C</td><td style="' + NTD + '"></td><td style="' + NTD + '"></td><td style="' + NTD + '"></td><td style="' + NTD + '"></td></tr>';
      body += '</table>';

      // Sign-offs
      body += '<table style="width:100%;border-collapse:collapse;margin-top:5px">';
      body += '<tr>'
        + '<td style="border:2px solid #000;padding:6px 8px;font-weight:700;font-size:9.5pt;text-align:center;width:32%;background:#d0d8e8">ANALYST</td>'
        + '<td style="width:2%;border:none"></td>'
        + '<td style="border:2px solid #000;padding:6px 8px;font-weight:700;font-size:9.5pt;text-align:center;width:32%;background:#d0d8e8">CHECKED BY</td>'
        + '<td style="width:2%;border:none"></td>'
        + '<td style="border:2px solid #000;padding:6px 8px;font-weight:700;font-size:9.5pt;text-align:center;width:32%;background:#d0d8e8">QC MANAGER</td>'
        + '</tr><tr>'
        + '<td style="border-left:2px solid #000;border-right:2px solid #000;padding:24px 8px 5px;font-size:8.5pt">Sign &amp; Date:</td>'
        + '<td style="border:none"></td>'
        + '<td style="border-left:2px solid #000;border-right:2px solid #000;padding:24px 8px 5px;font-size:8.5pt">Sign &amp; Date:</td>'
        + '<td style="border:none"></td>'
        + '<td style="border-left:2px solid #000;border-right:2px solid #000;padding:24px 8px 5px;font-size:8.5pt">Sign &amp; Date:</td>'
        + '</tr><tr>'
        + '<td style="border:2px solid #000;border-top:1px solid #bbb;padding:8px 8px;font-size:8.5pt">Name:</td>'
        + '<td style="border:none"></td>'
        + '<td style="border:2px solid #000;border-top:1px solid #bbb;padding:8px 8px;font-size:8.5pt">Name:</td>'
        + '<td style="border:none"></td>'
        + '<td style="border:2px solid #000;border-top:1px solid #bbb;padding:8px 8px;font-size:8.5pt">Name:</td>'
        + '</tr></table>';

      body += nanoFooter(bom, '4 of 4');
      return '<div class="bom-page"><div class="bom-scale" style="padding:5mm 6mm 4mm">' + body + '</div></div>';
    }


    /* ════════════════════════════════════════════════════════
       MASTER REQUISITION SHEET
       Multi-page — full RM list for all cycles combined
    ════════════════════════════════════════════════════════ */
    function masterRequisitionSheet(boms) {
      if (!boms || !boms.length) return '';
      var bom = boms[0];
      var cycles = boms.length;
      var lastBom = boms[boms.length - 1];
      var allComps = (bom.components || []).filter(function (c) { return c && c.component; });
      var comps = allComps.filter(function (c) { return !c.isHeader; });
      var MLOGO = 'data:image/png;base64,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';
      var ROWS_PER_MASTER_PAGE = 30; // more rows per page since header is compact

      function mTotal(qty) {
        var n = parseFloat(qty);
        if (isNaN(n)) return '';
        return parseFloat((n * cycles).toFixed(4));
      }
      function mSecTotal(items) {
        var m = {};
        items.forEach(function (c) { var u = (c.uom || '-').trim(), q = parseFloat(c.qty); if (!isNaN(q)) m[u] = (m[u] || 0) + q; });
        var per = Object.entries(m).map(function (e) { return parseFloat(e[1].toFixed(4)) + ' ' + e[0]; }).join(' + ');
        var tot = Object.entries(m).map(function (e) { return parseFloat((e[1] * cycles).toFixed(4)) + ' ' + e[0]; }).join(' + ');
        return { per: per, tot: tot };
      }
      function mGroups(components) {
        var groups = [], cur = { header: null, items: [] };
        components.forEach(function (c) {
          if (!c || !c.component) return;
          if (c.isHeader) { if (cur.items.length || cur.header) groups.push(cur); cur = { header: c, items: [] }; }
          else cur.items.push(c);
        });
        groups.push(cur);
        return groups;
      }
      var groups = mGroups(allComps);
      var hasSec = groups.some(function (g) { return g.header !== null; });

      // Grand total
      var gtMap = {};
      comps.forEach(function (c) { var u = (c.uom || '-').trim(), q = parseFloat(c.qty); if (!isNaN(q)) gtMap[u] = (gtMap[u] || 0) + q; });
      var gtPer = Object.entries(gtMap).map(function (e) { return parseFloat(e[1].toFixed(4)) + ' ' + e[0]; }).join(' + ');
      var gtTot = Object.entries(gtMap).map(function (e) { return parseFloat((e[1] * cycles).toFixed(4)) + ' ' + e[0]; }).join(' + ');

      var MTH = 'border:1px solid #000;padding:3px 4px;font-weight:700;font-size:8.5pt;text-align:center;background:#c8d8ea;';
      var MTV = 'border:1px solid #000;padding:2px 4px;font-size:8.5pt;';

      // Shared letterhead + batch info header (shown on every page)
      function masterPageHeader(pageNum, totalPages) {
        var h = '<div style="display:flex;align-items:center;gap:10px;border-bottom:2.5px solid #000;padding-bottom:3px;margin-bottom:2px">'
          + '<img src="' + MLOGO + '" style="height:48px;width:auto"/>'
          + '<div style="text-align:center;flex:1">'
          + '<div style="font-weight:700;font-size:16pt;letter-spacing:1px;font-family:Georgia,serif">SOM PHYTO PHARMA INDIA LTD.,</div>'
          + '<div style="font-size:8.5pt;margin-top:1px">Plot No. 154/A5-1 5VICE, IDA Bollaram - 502325 &nbsp;|&nbsp; +91 9885438365</div>'
          + '</div></div>'
          + '<div style="text-align:center;font-weight:700;font-size:11pt;background:#1a4a6b;color:#fff;padding:3px 0;letter-spacing:1px;margin-bottom:0">'
          + 'RAW MATERIAL MASTER REQUISITION SHEET &nbsp;&nbsp; Page ' + pageNum + ' of ' + totalPages + '</div>';

        // Compact info strip (only on page 1 full, others just product+bom range)
        if (pageNum === 1) {
          h += '<table style="width:100%;border-collapse:collapse">'
            + '<tr>'
            + '<td style="' + BSL + 'width:16%">PRODUCT NAME</td>'
            + '<td style="' + BSV + 'font-weight:700;font-size:10pt;width:34%"><b>' + esc(bom.productName) + '</b></td>'
            + '<td style="' + BSL + 'width:14%">DI No.</td>'
            + '<td style="' + BSV + 'width:36%">' + esc(bom.diNumber || '') + '</td>'
            + '</tr><tr>'
            + '<td style="' + BSL + '">BATCH SIZE</td>'
            + '<td style="' + BSV + 'font-weight:700">' + esc(bom.batchSize || '') + ' ' + esc(bom.batchSizeUom || '') + '</td>'
            + '<td style="' + BSL + '">TOTAL ORDER QTY</td>'
            + '<td style="' + BSV + 'font-weight:700">' + (parseFloat(bom.batchSize || 0) * cycles).toFixed(2) + ' ' + esc(bom.batchSizeUom || '') + '</td>'
            + '</tr><tr>'
            + '<td style="' + BSL + '">BOM RANGE</td>'
            + '<td style="' + BSV + 'font-weight:700">' + esc(bom.bomNo) + ' &#8594; ' + esc(lastBom.bomNo) + '</td>'
            + '<td style="' + BSL + '">No. OF CYCLES</td>'
            + '<td style="' + BSV + 'font-weight:700;font-size:11pt">' + cycles + '</td>'
            + '</tr><tr>'
            + '<td style="' + BSL + '">DATE</td>'
            + '<td style="' + BSV + '">' + fmtDate(bom.dateRequisition) + '</td>'
            + '<td style="' + BSL + '">SECTION</td>'
            + '<td style="' + BSV + '">' + esc(bom.section || '') + '</td>'
            + '</tr></table>';
        } else {
          h += '<table style="width:100%;border-collapse:collapse">'
            + '<tr>'
            + '<td style="' + BSL + 'width:16%">PRODUCT</td>'
            + '<td style="' + BSV + 'font-weight:700;width:34%">' + esc(bom.productName) + '</td>'
            + '<td style="' + BSL + 'width:14%">BOM RANGE</td>'
            + '<td style="' + BSV + 'font-weight:700">' + esc(bom.bomNo) + ' &#8594; ' + esc(lastBom.bomNo) + '</td>'
            + '</tr></table>';
        }
        return h;
      }

      // Component table header (repeated on every page)
      var compTableHdr = '<table style="width:100%;border-collapse:collapse;margin-top:2px">'
        + '<tr style="background:#1a4a6b">'
        + '<th colspan="6" style="border:1px solid #000;padding:3px 6px;font-weight:700;font-size:9.5pt;text-align:center;color:#fff">COMPONENT REQUIREMENTS — ALL ' + cycles + ' CYCLES</th>'
        + '</tr>'
        + '<tr>'
        + '<th style="' + MTH + ';width:5%">S.No.</th>'
        + '<th style="' + MTH + ';width:36%">COMPONENT / SECTION</th>'
        + '<th style="' + MTH + ';width:14%">PER BATCH QTY</th>'
        + '<th style="' + MTH + ';width:7%">UOM</th>'
        + '<th style="' + MTH + ';width:16%">TOTAL (' + cycles + ' cycles)</th>'
        + '<th style="' + MTH + '">REMARKS / ISSUED &#10003;</th>'
        + '</tr>';

      // ── Paginate allComps for master sheet ──
      // Count only non-header rows toward limit; headers stay with their section
      var masterPages = [];
      var mPage = [];
      var mCount = 0;
      var mCurHeader = null;

      allComps.forEach(function (c) {
        if (!c || !c.component) return;
        if (c.isHeader) {
          mCurHeader = c;
          mPage.push(c);
        } else {
          if (mCount >= ROWS_PER_MASTER_PAGE) {
            masterPages.push(mPage);
            mPage = [];
            mCount = 0;
            if (mCurHeader) mPage.push(mCurHeader);
          }
          mPage.push(c);
          mCount++;
        }
      });
      if (mPage.length > 0) masterPages.push(mPage);
      if (masterPages.length === 0) masterPages.push([]);
      var totalMasterPages = masterPages.length;

      // ── Map section last items for sub-total injection ──
      var mSecEnds = [];
      if (hasSec) {
        groups.forEach(function (g) {
          if (!g.header || !g.items.length) return;
          var last = null;
          for (var i = g.items.length - 1; i >= 0; i--) { if (g.items[i] && g.items[i].component) { last = g.items[i]; break; } }
          if (last) mSecEnds.push({ item: last, group: g });
        });
      }

      // ── Build each page ──
      var sno = 0;
      var allPages = masterPages.map(function (pageRows, pgIdx) {
        var isLast = pgIdx === totalMasterPages - 1;
        var pgNum = pgIdx + 1;
        var pageBody = masterPageHeader(pgNum, totalMasterPages) + compTableHdr + '<tbody>';

        pageRows.forEach(function (c) {
          if (c.isHeader) {
            pageBody += '<tr style="background:#d8e8f5">'
              + '<td colspan="6" style="border:1px solid #5585aa;padding:3px 8px;font-weight:700;font-size:9pt;font-style:italic;color:#1a3f5c">&#9658;&nbsp;' + esc(c.component) + '</td>'
              + '</tr>';
            return;
          }
          sno++;
          var tq = mTotal(c.qty);
          pageBody += '<tr style="height:16px;background:' + (sno % 2 === 0 ? '#f9f9f9' : '#fff') + '">'
            + '<td style="' + MTV + ';text-align:center">' + sno + '</td>'
            + '<td style="' + MTV + '">' + esc(c.component) + '</td>'
            + '<td style="' + MTV + ';text-align:center">' + esc(c.qty || '') + '</td>'
            + '<td style="' + MTV + ';text-align:center">' + esc(c.uom || '') + '</td>'
            + '<td style="' + MTV + ';text-align:center;font-weight:700">' + (tq || '') + '</td>'
            + '<td style="' + MTV + '"></td>'
            + '</tr>';
          // Section sub-total
          for (var msi = 0; msi < mSecEnds.length; msi++) {
            if (mSecEnds[msi].item === c) {
              var st = mSecTotal(mSecEnds[msi].group.items);
              pageBody += '<tr style="background:#eef4ea">'
                + '<td colspan="2" style="border:1px solid #000;padding:2px 5px;font-weight:700;font-size:8pt;text-align:right;color:#2d5e18;font-style:italic">&#8627; ' + esc(mSecEnds[msi].group.header.component) + ' — Section Total:</td>'
                + '<td style="border:1px solid #000;padding:2px 5px;font-size:8pt;font-weight:700;color:#2d5e18">' + st.per + '</td>'
                + '<td style="border:1px solid #000"></td>'
                + '<td style="border:1px solid #000;padding:2px 5px;font-size:8pt;font-weight:700;color:#2d5e18">' + st.tot + '</td>'
                + '<td style="border:1px solid #000"></td>'
                + '</tr>';
              break;
            }
          }
        });

        // Grand total + sign-off on last page only
        if (isLast) {
          pageBody += '<tr style="background:#d0d8e8">'
            + '<td colspan="2" style="border:1px solid #000;padding:4px 6px;font-weight:700;font-size:9pt;text-align:center">GRAND TOTAL (' + comps.length + ' items)</td>'
            + '<td style="border:1px solid #000;padding:4px 6px;font-weight:700;font-size:9pt">' + gtPer + '</td>'
            + '<td style="border:1px solid #000"></td>'
            + '<td style="border:1px solid #000;padding:4px 6px;font-weight:700;font-size:9pt">' + gtTot + '</td>'
            + '<td style="border:1px solid #000"></td>'
            + '</tr>';
        }

        pageBody += '</tbody></table>';

        // Sign-off on last page
        if (isLast) {
          pageBody += '<table style="width:100%;border-collapse:collapse;margin-top:4px">'
            + '<tr>'
            + '<td style="border:2px solid #000;padding:5px 8px;font-weight:700;font-size:9.5pt;text-align:center;width:48%;background:#f0f0f0">Stores In-charge (Issuance)</td>'
            + '<td style="width:4%;border:none"></td>'
            + '<td style="border:2px solid #000;padding:5px 8px;font-weight:700;font-size:9.5pt;text-align:center;width:48%;background:#f0f0f0">Production Incharge (Acknowledgement)</td>'
            + '</tr><tr>'
            + '<td style="border-left:2px solid #000;border-right:2px solid #000;padding:20px 8px 4px;font-size:9pt">Signature &amp; Date :</td>'
            + '<td style="border:none"></td>'
            + '<td style="border-left:2px solid #000;border-right:2px solid #000;padding:20px 8px 4px;font-size:9pt">Signature &amp; Date :</td>'
            + '</tr><tr>'
            + '<td style="border:2px solid #000;border-top:1px solid #bbb;padding:7px 8px;font-size:9pt">Issued On :</td>'
            + '<td style="border:none"></td>'
            + '<td style="border:2px solid #000;border-top:1px solid #bbb;padding:7px 8px;font-size:9pt">Received On :</td>'
            + '</tr></table>';
        }

        pageBody += '<div style="margin-top:3px;font-size:8pt;color:#555;display:flex;justify-content:space-between;border-top:0.5px solid #bbb;padding-top:2px">'
          + '<span>Master Requisition | ' + esc(bom.bomNo) + ' &#8594; ' + esc(lastBom.bomNo) + '</span>'
          + '<span>Page ' + pgNum + ' of ' + totalMasterPages + '</span>'
          + '<span>SOM PHYTO PHARMA INDIA LTD.</span></div>';

        return '<div class="bom-page"><div class="bom-scale" style="padding:5mm 6mm 4mm">' + pageBody + '</div></div>';
      });

      return allPages.join('');
    }

    function buildPrintHtml(pages, title) {
      return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + (title || 'BOM') + '</title>'
        + '<style>'
        + '@page{size:A4 portrait;margin:0}'
        + 'body{margin:0;padding:0;background:#fff}'
        + '.bom-page{width:210mm;height:297mm;overflow:hidden;page-break-after:always;position:relative}'
        + '.bom-page:last-child{page-break-after:auto}'
        + '.bom-scale{width:210mm;padding:6mm 7mm 5mm;box-sizing:border-box;font-family:\'Times New Roman\',Georgia,serif}'
        + '.bom-half-scale{width:210mm;box-sizing:border-box;font-family:Georgia,serif;display:flex;flex-direction:column;height:297mm;}'
        + '@media screen{.bom-page{box-shadow:0 2px 8px rgba(0,0,0,0.15);margin:10px auto}}'
        + '@media print{'
        + 'html,body{width:210mm;height:297mm;margin:0;padding:0}'
        + '.bom-page{width:210mm;height:297mm;overflow:hidden;page-break-after:always;page-break-inside:avoid}'
        + '.bom-scale{transform:scale(0.93);transform-origin:top left;}'
        + '.bom-half-scale{transform:scale(0.96);transform-origin:top left;}'
        + '}'
        + '</style>'
        + '</head><body>' + pages + '</body></html>';
    }

export {
  genId, todayStr, todayISO, esc, fmtDate, incrCode, normalizeToUnit, scaleToQty,
  bomInnerHtml, bomHalfPageBlock, isDualCopy, bomDualHalfPage, fullBomPage,
  bsPage, bsHeader, bsRow4, bsRow2, bsSec, bsFooter,
  technicalSheet, formulationSheet, packingSheet, coaSheet,
  nanoHdr, ntick, nyn, nanoFooter, nanoSheet1, nanoSheet2, nanoSheet3, nanoQcSheet,
  masterRequisitionSheet, buildPrintHtml,
}
