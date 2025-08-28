import { Icon, LI, Nav, Span, UL } from '@ezstart/ui/components';
import Link from 'next/link';

const NavBilling = () => {
  return (
    <Nav>
      <UL layout={'menu'} size={'default'}>
        <LI>
          <Link
            href='/ez-features/ez-billing/clients'
            className='flex gap-2 items-center'
          >
            <Icon size={14} name='lucide:Users' />
            <Span>Clients</Span>
          </Link>
        </LI>
        <LI>
          <Link
            href='/ez-features/ez-billing/quotes'
            className='flex gap-2 items-center'
          >
            <Icon size={14} name='fa:FaQuestion' />
            <Span>Quotes</Span>
          </Link>
        </LI>
        <LI>
          <Link
            href='/ez-features/ez-billing/invoices'
            className='flex gap-2 items-center'
          >
            <Icon size={14} name='fa:FaFileInvoice' />
            <Span>Invoices</Span>
          </Link>
        </LI>
        <LI>
          <Link
            href='/ez-features/ez-billing/receipts'
            className='flex gap-2 items-center'
          >
            <Icon size={14} name='fa:FaReceipt' />
            <Span>Receipts</Span>
          </Link>
        </LI>
      </UL>
    </Nav>
  );
};

export default NavBilling;
